public without sharing class Resource360NotificationDispatcher implements Queueable {
    public void execute(QueueableContext context) {
        List<R360_Outbox_Event__c> requests = [
            SELECT Id, Event_ID__c, Payload__c, State__c, Attempt_Count__c
            FROM R360_Outbox_Event__c
            WHERE Event_Type__c = 'NOTIFICATION_REQUESTED' AND State__c IN ('Pending', 'Published', 'Retry Pending')
                AND (Next_Attempt_At__c = null OR Next_Attempt_At__c <= :System.now())
            LIMIT 40 FOR UPDATE
        ];
        for (R360_Outbox_Event__c request : requests) {
            new Resource360NotificationJob(request.Id).execute(null);
        }
    }
}
