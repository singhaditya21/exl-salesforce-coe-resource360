@IsTest
private class Resource360OperationsRecoveryTest {
    @TestSetup
    static void setupData() { Resource360DemoData.seed(); }

    @IsTest
    static void overlappingSchedulerExecutionIsSkippedWithAuditEvidence() {
        R360_Integration_Run__c active = new R360_Integration_Run__c(
            Run_ID__c='OPS-ACTIVE-TEST', Source_System__c='Resource360', Entity_Type__c='Operational Controls',
            State__c='Running', Started_At__c=System.now().addMinutes(-5), Source_Cutoff__c=System.now(),
            Correlation_ID__c='OPS-ACTIVE-CORRELATION', Contract_Version__c='R360-MOCK-1.2', Commit_Mode__c='Scheduled'
        );
        insert active;
        Test.startTest();
        new Resource360OperationsScheduler().execute(null);
        Test.stopTest();
        R360_Integration_Run__c skipped = [SELECT State__c,Processed_Count__c,Detail__c FROM R360_Integration_Run__c WHERE Run_ID__c LIKE 'OPS-SKIPPED-%' LIMIT 1];
        System.assertEquals('Skipped', skipped.State__c);
        System.assertEquals(0, skipped.Processed_Count__c);
        System.assert(skipped.Detail__c.contains('OPS-ACTIVE-TEST'));
        String skippedId = String.valueOf(skipped.Id);
        System.assertEquals(1, [SELECT COUNT() FROM R360_Audit_Event__c WHERE Action__c='OPERATIONS_RUN_SKIPPED' AND Entity_ID__c=:skippedId]);
    }

    @IsTest
    static void retryStormStopsAtDeadLetterAndDuplicateNotificationsAreSuppressed() {
        R360_Outbox_Event__c retry = new R360_Outbox_Event__c(Attempt_Count__c=0);
        Resource360OutboxPublisher.applyFailure(retry, 'Transient adapter failure.');
        System.assertEquals('Retry Pending', retry.State__c);
        System.assertNotEquals(null, retry.Next_Attempt_At__c);
        retry.Attempt_Count__c = Resource360Policy.numberValue('Outbox_Max_Attempts', 3);
        Resource360OutboxPublisher.applyFailure(retry, 'Permanent adapter failure.');
        System.assertEquals('Dead Letter', retry.State__c);
        System.assertEquals(null, retry.Next_Attempt_At__c);

        Resource360EventService.NotificationRequest request = new Resource360EventService.NotificationRequest('DEDUPE-NOTIFICATION', UserInfo.getUserId(), 'Controlled alert', 'Sanitized operational alert.', 'High', '/lightning/page/home');
        System.assertEquals(1, Resource360EventService.enqueueNotifications(new List<Resource360EventService.NotificationRequest>{request}));
        System.assertEquals(0, Resource360EventService.enqueueNotifications(new List<Resource360EventService.NotificationRequest>{request}));

        R360_Outbox_Event__c invalid = new R360_Outbox_Event__c(
            Event_ID__c='INVALID-NOTIFICATION-DELIVERY', Correlation_ID__c='INVALID-NOTIFICATION', Event_Type__c='NOTIFICATION_REQUESTED',
            Aggregate_Type__c='User', Aggregate_ID__c=String.valueOf(UserInfo.getUserId()), Aggregate_Version__c=1,
            Payload__c='{}', State__c='Retry Pending', Attempt_Count__c=2, Next_Attempt_At__c=System.now()
        );
        insert invalid;
        new Resource360NotificationJob(invalid.Id).execute(null);
        invalid = [SELECT State__c,Attempt_Count__c,Next_Attempt_At__c,Last_Error__c FROM R360_Outbox_Event__c WHERE Id=:invalid.Id];
        System.assertEquals('Dead Letter', invalid.State__c);
        System.assertEquals(3, invalid.Attempt_Count__c);
        System.assertEquals(null, invalid.Next_Attempt_At__c);
        System.assertNotEquals(null, invalid.Last_Error__c);
    }
}
