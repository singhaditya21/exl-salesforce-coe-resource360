@IsTest
private class Resource360StaffingConcurrencyTest {
    @TestSetup
    static void setupData() { Resource360DemoData.seed(); }

    @IsTest
    static void decisionTimeRevalidationPreventsCompetingCapacityCommit() {
        Resource__c resource = [SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-019830'];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        Date startDate = nextMonday(Date.today().addDays(1));
        Date endDate = startDate.addDays(10);
        Resource360Service.ServiceResult first = Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'MuleSoft Developer', 'Billing', startDate, endDate, 6, 'CONCURRENCY-FIRST');
        Resource360Service.ServiceResult second = Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'Integration Architect', 'Billing', startDate, endDate, 6, 'CONCURRENCY-SECOND');

        Test.startTest();
        Resource360Service.ServiceResult accepted = Resource360Service.decideStaffingRequest(first.recordId, true, 'Current budget and capacity revalidated.', 'ignored');
        Test.stopTest();
        System.assertEquals(1, [SELECT COUNT() FROM Allocation__c WHERE Id=:accepted.recordId AND State__c='Accepted' AND Current__c=true]);
        System.assertEquals('Pending', [SELECT State__c FROM Staffing_Request__c WHERE Id=:second.recordId].State__c,'A feasible governed over-allocation request must remain non-consuming until independently approved.');
        System.assertEquals(0, [SELECT COUNT() FROM Allocation__c WHERE Originating_Request__c=:second.recordId AND State__c='Accepted' AND Current__c=true]);
    }

    private static Date nextMonday(Date input) {
        Date cursor = input;
        while (Math.mod(Date.newInstance(1900,1,1).daysBetween(cursor),7) != 0) cursor = cursor.addDays(1);
        return cursor;
    }
}
