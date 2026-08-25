@IsTest
private class Resource360DemoScenarioDataTest {
    @TestSetup static void setupData(){Resource360DemoData.seed();}
    @IsTest static void deterministicScenarioQueuesAreCompleteAndIdempotent(){
        Resource360DemoScenarioData.ensure();Resource360DemoScenarioData.ensure();
        System.assertEquals(9,[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'DEMO-EXL-%']);
        System.assertEquals(2,[SELECT COUNT() FROM Engagement__c WHERE Engagement_ID__c LIKE 'DEMO-ENG-%']);
        System.assert([SELECT COUNT() FROM Staffing_Request__c WHERE Idempotency_Key__c LIKE 'DEMO-SR-%' AND State__c='Pending']>0);
        System.assert([SELECT COUNT() FROM Staffing_Request__c WHERE Idempotency_Key__c LIKE 'DEMO-SR-%' AND State__c='Declined']>0);
        System.assertEquals(4,[SELECT COUNT() FROM Allocation__c WHERE Originating_Request__r.Idempotency_Key__c LIKE 'DEMO-SR-ALLOC-%' AND Current__c=true]);
        System.assertEquals(5,[SELECT COUNT() FROM Timesheet__c WHERE Week_Key__c LIKE 'DEMO-TS-%']);
        System.assertEquals(4,[SELECT COUNT() FROM R360_Learning_Achievement__c WHERE Achievement_ID__c LIKE 'DEMO-LRN-%']);
        System.assertEquals(3,[SELECT COUNT() FROM R360_Calendar_Exception__c WHERE Exception_Key__c LIKE 'DEMO-CAL-%']);
        System.assertEquals(4,[SELECT COUNT() FROM R360_Configuration__c WHERE Version_Key__c LIKE 'DEMO-CONFIG-%']);
        System.assertEquals(3,[SELECT COUNT() FROM R360_Integration_Error__c WHERE Integration_Run__r.Run_ID__c='DEMO-SOURCE-ERRORS']);
        System.assertEquals(5,[SELECT COUNT() FROM R360_Notification__c WHERE Event_ID__c IN ('DEMO-NTF-STAFFING','DEMO-NTF-TIME','DEMO-NTF-INTEGRATION','DEMO-NTF-CLOSED','DEMO-NTF-BUDGET')]);
    }
}
