@IsTest
private class Resource360CapacityServiceTest {
    @TestSetup
    static void setupData(){
        Resource360DemoData.seed();
    }

    @IsTest
    static void directDmlEnforcesLineAggregateLedgerAndHolidayControls(){
        Resource__c resource=kabir();
        Engagement__c project=project();
        Date startDate=workingToday();
        Date endDate=startDate.addDays(4);

        Allocation__c first=published(resource.Id,project.Id,startDate,endDate,5);
        insert first;
        R360_Daily_Capacity__c ledger=ledger(resource.Id);
        System.assertEquals(5,ledger.Allocated_Hours__c);
        System.assertEquals('Underallocated',ledger.Capacity_Status__c);

        Allocation__c unapproved=published(resource.Id,project.Id,startDate,endDate,4);
        unapproved.Overallocation_Status__c='Pending Approval';
        unapproved.Overallocation_Approved_By__c=null;
        unapproved.Overallocation_Approved_At__c=null;
        unapproved.Overallocation_Expiry_Date__c=null;
        Database.SaveResult rejected=Database.insert(unapproved,false);
        System.assertEquals(false,rejected.isSuccess(),'Direct DML must not bypass aggregate approval.');

        Database.SaveResult oversized=Database.insert(published(resource.Id,project.Id,startDate,endDate,9),false);
        System.assertEquals(false,oversized.isSuccess(),'One allocation line cannot exceed eight hours.');

        insert published(resource.Id,project.Id,startDate,endDate,3);
        ledger=ledger(resource.Id);
        System.assertEquals(8,ledger.Allocated_Hours__c);
        System.assertEquals('Fully Allocated',ledger.Capacity_Status__c);

        Database.SaveResult ledgerMutation=Database.insert(new R360_Daily_Capacity__c(Ledger_Key__c='TEST-DIRECT',Resource__c=resource.Id,Work_Date__c=startDate,Standard_Hours__c=8,Allocated_Hours__c=8,Capacity_Status__c='Fully Allocated',Allocation_Count__c=1,Approved_Overallocated__c=false,Pending_Approval_Count__c=0,Reconciled_At__c=System.now()),false);
        System.assertEquals(false,ledgerMutation.isSuccess(),'The derived capacity ledger must reject direct writes.');

        R360_Work_Calendar__c calendar=[SELECT Id FROM R360_Work_Calendar__c WHERE Id=:resource.Work_Calendar__c];
        Date holiday=startDate.addDays(7);
        insert new R360_Calendar_Exception__c(Calendar__c=calendar.Id,Exception_Key__c='TEST-HOLIDAY',Exception_Date__c=holiday,Capacity_Hours__c=0,Reason__c='Controlled test holiday');
        Database.SaveResult holidayAllocation=Database.insert(published(resource.Id,project.Id,holiday,holiday,1),false);
        System.assertEquals(false,holidayAllocation.isSuccess(),'A holiday-only allocation cannot be committed.');
    }

    @IsTest
    static void draftPublicationRequiresIndependentApprovalAndPreservesEvidence(){
        Resource__c resource=kabir();
        Engagement__c project=project();
        Date startDate=workingToday();
        Date endDate=startDate.addDays(4);
        insert published(resource.Id,project.Id,startDate,endDate,5);

        Allocation__c draft=draft(resource.Id,project.Id,startDate,endDate,4);
        insert draft;
        Resource360CapacityService.DecisionResult submitted=Resource360CapacityService.publishDraft(draft.Id,'Critical release overlap for two projects.');
        System.assertEquals(true,submitted.requiresApproval);
        System.assertEquals('Pending Approval',submitted.status);
        System.assertEquals(5,ledger(resource.Id).Allocated_Hours__c,'Draft capacity must not be committed.');

        Resource360CapacityService.DecisionResult approved=Resource360CapacityService.decideOverallocation(draft.Id,true,'Head of Delivery approved through the review window.');
        System.assertEquals(true,approved.published);
        System.assertEquals(9,approved.projectedDailyHours);
        Allocation__c committed=[SELECT State__c,Planning_Status__c,Overallocation_Status__c,Overallocation_Reason__c,Overallocation_Approved_By__c,Overallocation_Approved_At__c,Overallocation_Expiry_Date__c,Capacity_Policy_Version__c FROM Allocation__c WHERE Id=:draft.Id];
        System.assertEquals('Accepted',committed.State__c);
        System.assertEquals('Published',committed.Planning_Status__c);
        System.assertEquals('Approved',committed.Overallocation_Status__c);
        System.assertNotEquals(null,committed.Overallocation_Approved_By__c);
        System.assertNotEquals(null,committed.Overallocation_Approved_At__c);
        System.assert(committed.Overallocation_Expiry_Date__c>Date.today());
        System.assertEquals('R360-CAPACITY-1.0',committed.Capacity_Policy_Version__c);
        R360_Daily_Capacity__c ledger=ledger(resource.Id);
        System.assertEquals(9,ledger.Allocated_Hours__c);
        System.assertEquals('Overallocated',ledger.Capacity_Status__c);
        System.assertEquals(true,ledger.Approved_Overallocated__c);
        System.assert([SELECT COUNT() FROM R360_Audit_Event__c WHERE Entity_ID__c=:String.valueOf(draft.Id) AND Action__c IN ('OVERALLOCATION_SUBMITTED','OVERALLOCATION_APPROVED')]>=2);
    }

    @IsTest
    static void approvalRechecksStalePlansAndEnforcesTwelveHourCeiling(){
        Resource__c resource=kabir();
        Engagement__c project=project();
        Date startDate=workingToday();
        Date endDate=startDate.addDays(4);
        insert published(resource.Id,project.Id,startDate,endDate,8);

        Allocation__c firstDraft=draft(resource.Id,project.Id,startDate,endDate,2);
        Allocation__c secondDraft=draft(resource.Id,project.Id,startDate,endDate,2);
        insert new List<Allocation__c>{firstDraft,secondDraft};
        Resource360CapacityService.publishDraft(firstDraft.Id,'First controlled overlap.');
        Resource360CapacityService.publishDraft(secondDraft.Id,'Second controlled overlap.');
        Resource360CapacityService.decideOverallocation(firstDraft.Id,true,'Independent approval one.');
        Resource360CapacityService.decideOverallocation(secondDraft.Id,true,'Independent approval two after locked recheck.');
        System.assertEquals(12,ledger(resource.Id).Allocated_Hours__c);

        Test.startTest();
        Allocation__c thirdDraft=draft(resource.Id,project.Id,startDate,endDate,1);
        insert thirdDraft;
        Boolean blocked=false;
        try{Resource360CapacityService.publishDraft(thirdDraft.Id,'Would exceed the governed ceiling.');}catch(AuraHandledException expected){blocked=true;}
        Test.stopTest();
        System.assertEquals(true,blocked,'Every publication must recheck locked aggregate capacity.');
    }

    @IsTest
    static void expiryTurnsApprovedOverageIntoVisibleException(){
        Resource__c resource=kabir();
        Engagement__c project=project();
        Date startDate=workingToday();
        Date endDate=startDate.addDays(4);
        insert published(resource.Id,project.Id,startDate,endDate,5);
        Allocation__c overage=published(resource.Id,project.Id,startDate,endDate,4);
        insert overage;
        System.assertEquals(true,ledger(resource.Id).Approved_Overallocated__c);

        Resource360CapacityService.reviewDateOverride=Date.today().addDays(31);
        Integer expired=Resource360CapacityService.expireReviews('TEST-CAPACITY-EXPIRY');
        Resource360CapacityService.reviewDateOverride=null;
        System.assertEquals(1,expired);
        overage=[SELECT Planning_Status__c,Overallocation_Status__c FROM Allocation__c WHERE Id=:overage.Id];
        System.assertEquals('Expired',overage.Planning_Status__c);
        System.assertEquals('Expired',overage.Overallocation_Status__c);
        System.assertEquals(false,ledger(resource.Id).Approved_Overallocated__c);
        System.assertEquals(1,[SELECT COUNT() FROM R360_Audit_Event__c WHERE Entity_ID__c=:String.valueOf(overage.Id) AND Action__c='OVERALLOCATION_REVIEW_EXPIRED']);
    }

    @IsTest
    static void actualTimeRemainsCappedAtEightHoursAcrossProjects(){
        Resource__c resource=kabir();
        Engagement__c project=project();
        Date monday=nextMonday(Date.today().addDays(7));
        Date endDate=monday.addDays(4);
        Allocation__c first=published(resource.Id,project.Id,monday,endDate,5);
        Allocation__c second=published(resource.Id,project.Id,monday,endDate,4);
        insert first;
        insert second;
        Resource360Service.ServiceResult sheet=Resource360TimeService.createTimesheet(resource.Id,monday);
        Resource360TimeService.saveEntry(sheet.recordId,first.Id,monday,5,null,'Primary project delivery.');
        Boolean blocked=false;
        try{Resource360TimeService.saveEntry(sheet.recordId,second.Id,monday,4,null,'Approved allocation, but actual time cannot exceed eight.');}catch(AuraHandledException expected){blocked=true;}
        System.assertEquals(true,blocked);
        Database.SaveResult directBypass=Database.insert(new Time_Entry__c(Timesheet__c=sheet.recordId,Allocation__c=second.Id,Engagement__c=project.Id,Work_Date__c=monday,Hours__c=4,Role__c='Salesforce Delivery',State__c='Draft',Entry_Key__c='TEST-DIRECT-TIME-BYPASS'),false);
        System.assertEquals(false,directBypass.isSuccess(),'Direct DML must enforce the same aggregate eight-hour actual-time ceiling.');
        AggregateResult actual=[SELECT SUM(Hours__c) total FROM Time_Entry__c WHERE Timesheet__c=:sheet.recordId][0];
        System.assertEquals(5,(Decimal)actual.get('total'));
    }

    private static Resource__c kabir(){return [SELECT Id,Work_Calendar__c FROM Resource__c WHERE Employee_ID__c='EXL-019830'];}
    private static Engagement__c project(){return [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];}
    private static R360_Daily_Capacity__c ledger(Id resourceId){return [SELECT Allocated_Hours__c,Capacity_Status__c,Approved_Overallocated__c,Pending_Approval_Count__c FROM R360_Daily_Capacity__c WHERE Resource__c=:resourceId];}
    private static Allocation__c published(Id resourceId,Id projectId,Date startDate,Date endDate,Decimal hours){Allocation__c allocation=new Allocation__c(Originating_Request__c=requestId(),Resource__c=resourceId,Engagement__c=projectId,Role__c='Salesforce Delivery',Classification__c='Billing',Billable_Snapshot__c=true,Start_Date__c=startDate,End_Date__c=endDate,Daily_Hours__c=hours,State__c='Accepted',Version__c=1,Current__c=true);Resource360CapacityService.stampSeededPublished(allocation,'Governed test publication.');return allocation;}
    private static Allocation__c draft(Id resourceId,Id projectId,Date startDate,Date endDate,Decimal hours){return new Allocation__c(Originating_Request__c=requestId(),Resource__c=resourceId,Engagement__c=projectId,Role__c='Salesforce Delivery',Classification__c='Billing',Billable_Snapshot__c=true,Start_Date__c=startDate,End_Date__c=endDate,Daily_Hours__c=hours,State__c='Draft',Planning_Status__c='Draft',Overallocation_Status__c='Not Required',Version__c=1,Current__c=true);}
    private static Id requestId(){return [SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'].Id;}
    private static Date workingToday(){Date candidate=Date.today();Integer day=Math.mod(Date.newInstance(1900,1,1).daysBetween(candidate),7);return day<5?candidate:nextMonday(candidate);}
    private static Date nextMonday(Date input){Date cursor=input;while(Math.mod(Date.newInstance(1900,1,1).daysBetween(cursor),7)!=0)cursor=cursor.addDays(1);return cursor;}
}
