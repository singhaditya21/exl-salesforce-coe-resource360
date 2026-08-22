@IsTest
private class Resource360ServiceTest {
    @TestSetup
    static void setupData() {
        Date today = Date.today();
        Resource__c resource = new Resource__c(Employee_ID__c='TEST-001', Preferred_Name__c='Test Practitioner', Status__c='Active', Employment_Start__c=today.addYears(-1), Tower__c='Platform', Daily_Capacity_Hours__c=8, Available_Percent__c=100);
        insert resource;
        Engagement__c engagement = new Engagement__c(Name='Test Engagement', Engagement_ID__c='TEST-ENG-001', Project_Manager__c=UserInfo.getUserId(), Start_Date__c=today.addMonths(-1), End_Date__c=today.addMonths(6), Status__c='Active', Revenue_Type__c='Time and Materials', Currency_Code__c='INR', Confidentiality__c='EXL Internal');
        insert engagement;
        insert new Budget__c(Engagement__c=engagement.Id, Version__c=1, State__c='Approved', Revenue__c=1000000, Base_Labour__c=500000, Uplift_Percent__c=5, Effort_Contingency_Percent__c=3, Expense_Contingency_Percent__c=2, Travel_Rate__c=0, Onsite_Months__c=0, Planned_Hours__c=1000, Economic_Signature__c='TEST-SIGNATURE');
        insert new Capability__c(Name='Platform Architecture', Capability_ID__c='TEST-CAP-001', Type__c='Salesforce', Tower__c='Platform', Category__c='Architecture', Active__c=true);
    }

    @IsTest
    static void staffingAcceptanceCommitsCapacity() {
        Resource__c resource = [SELECT Id FROM Resource__c WHERE Employee_ID__c='TEST-001'];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='TEST-ENG-001'];
        Test.startTest();
        Resource360Service.ServiceResult created = Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'Technical Architect', 'Billing', Date.today(), Date.today().addDays(30), 4, 'TEST-REQUEST-001');
        Resource360Service.ServiceResult accepted = Resource360Service.decideStaffingRequest(created.recordId, true, 'Validated', 'COE Staffer');
        Test.stopTest();
        System.assert(created.success);
        System.assert(accepted.success);
        System.assertEquals('Accepted', [SELECT State__c FROM Staffing_Request__c WHERE Id=:created.recordId].State__c);
        System.assertEquals(1, [SELECT COUNT() FROM Allocation__c WHERE Originating_Request__c=:created.recordId]);
        System.assertEquals(2, [SELECT COUNT() FROM R360_Audit_Event__c]);
    }

    @IsTest
    static void budgetSkillAndTimeFlow() {
        Resource__c resource = [SELECT Id FROM Resource__c WHERE Employee_ID__c='TEST-001'];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='TEST-ENG-001'];
        Capability__c capability = [SELECT Id FROM Capability__c WHERE Capability_ID__c='TEST-CAP-001'];
        Budget__c draft = new Budget__c(Engagement__c=engagement.Id, Version__c=2, State__c='Draft', Revenue__c=1000000, Base_Labour__c=400000, Uplift_Percent__c=5, Effort_Contingency_Percent__c=3, Expense_Contingency_Percent__c=2, Travel_Rate__c=0, Onsite_Months__c=0, Planned_Hours__c=1000);
        insert draft;
        Resource360Service.ServiceResult budgetResult = Resource360Service.submitBudget(draft.Id);
        Resource360Service.ServiceResult claimResult = Resource360Service.submitSkillClaim(resource.Id, capability.Id, 3, 4, 'Test evidence', 'TEST-CLAIM-001');
        Resource360Service.decideSkillClaim(claimResult.recordId, true, 3, 'Approved');
        System.assertEquals('Approved', [SELECT State__c FROM Budget__c WHERE Id=:draft.Id].State__c);
        System.assertEquals(3, [SELECT Approved_Level__c FROM Skill_Claim__c WHERE Id=:claimResult.recordId].Approved_Level__c);

        Resource360Service.ServiceResult requestResult = Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'Technical Architect', 'Billing', Date.today(), Date.today().addDays(30), 4, 'TEST-REQUEST-002');
        Id allocationId = Resource360Service.decideStaffingRequest(requestResult.recordId, true, null, 'COE Staffer').recordId;
        Date monday = mondayFor(Date.today());
        Timesheet__c timesheet = new Timesheet__c(Resource__c=resource.Id, Week_Start__c=monday, Week_Key__c='TEST-001-' + String.valueOf(monday), Status__c='Draft');
        insert timesheet;
        Date eligibleDate = monday < Date.today() ? Date.today() : monday;
        Resource360Service.saveTimeEntry(timesheet.Id, allocationId, eligibleDate, 4, null, 'Delivery work');
        Resource360Service.submitTimesheet(timesheet.Id);
        Resource360Service.decideTimesheet(timesheet.Id, true, 'Approved');
        System.assertEquals('Approved', [SELECT Status__c FROM Timesheet__c WHERE Id=:timesheet.Id].Status__c);
        System.assertEquals('Approved', [SELECT State__c FROM Time_Entry__c WHERE Timesheet__c=:timesheet.Id LIMIT 1].State__c);
        System.assertNotEquals(null, budgetResult.correlationId);
    }

    @IsTest
    static void returnsWorkspaceAndRejectsInvalidCapacity() {
        String payload = Resource360Service.getWorkspaceData();
        System.assert(payload.contains('resources'));
        Resource__c resource = [SELECT Id FROM Resource__c WHERE Employee_ID__c='TEST-001'];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='TEST-ENG-001'];
        Resource360Service.ServiceResult first = Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'Architect', 'Billing', Date.today(), Date.today().addDays(10), 8, 'TEST-FULL-001');
        Resource360Service.decideStaffingRequest(first.recordId, true, null, 'COE Staffer');
        try {
            Resource360Service.createStaffingRequest(engagement.Id, resource.Id, 'Developer', 'Billing', Date.today(), Date.today().addDays(10), 1, 'TEST-OVER-001');
            System.assert(false, 'Expected capacity validation.');
        } catch (AuraHandledException expected) {
            System.assertNotEquals(null, expected);
        }
    }

    @IsTest
    static void demoSeedIsCompactAndIdempotent() {
        Test.startTest();
        Resource360Service.ServiceResult first = Resource360DemoData.seed();
        Resource360Service.ServiceResult second = Resource360DemoData.seed();
        Test.stopTest();
        System.assert(first.success);
        System.assert(second.message.contains('already loaded'));
        System.assertEquals(3, [SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'EXL-%']);
        System.assertEquals(2, [SELECT COUNT() FROM Engagement__c WHERE Engagement_ID__c LIKE 'ENG-%']);
    }

    private static Date mondayFor(Date value) {
        Integer days = Date.newInstance(1900, 1, 1).daysBetween(value);
        return value.addDays(-Math.mod(days, 7));
    }
}
