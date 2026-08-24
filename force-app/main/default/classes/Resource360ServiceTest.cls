@IsTest
private class Resource360ServiceTest {
    @TestSetup
    static void setupData() {
        Resource360Service.ServiceResult seeded = Resource360DemoData.seed();
        System.assert(seeded.success, seeded.message);
    }

    @IsTest
    static void staffingIsIdempotentAndCommitsCapacityAtomically() {
        Resource__c resource = [SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-019830'];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        Date startDate = nextMonday(Date.today().addDays(1));
        Date endDate = startDate.addDays(11);

        Resource360Service.ServiceResult first = Resource360Service.createStaffingRequestV2(
            engagement.Id, resource.Id, 'MuleSoft Developer', 'Billing', startDate, endDate, 4,
            null, null, null, 'Approved skill, availability and delivery context', 'TEST-STAFF-001'
        );
        Resource360Service.ServiceResult duplicate = Resource360Service.createStaffingRequestV2(
            engagement.Id, resource.Id, 'MuleSoft Developer', 'Billing', startDate, endDate, 4,
            null, null, null, 'Approved skill, availability and delivery context', 'TEST-STAFF-001'
        );
        System.assertEquals(first.recordId, duplicate.recordId, 'The same idempotent payload must return the original request.');

        try {
            Resource360Service.createStaffingRequestV2(
                engagement.Id, resource.Id, 'Changed Role', 'Billing', startDate, endDate, 4,
                null, null, null, null, 'TEST-STAFF-001'
            );
            System.assert(false, 'A reused key with a changed payload must fail.');
        } catch (AuraHandledException expected) {
            System.assertNotEquals(null, expected.getMessage());
        }

        Resource360Service.ServiceResult competing = Resource360Service.createStaffingRequest(
            engagement.Id, resource.Id, 'Integration Architect', 'Billing', startDate, endDate, 5, 'TEST-STAFF-002'
        );
        Resource360Service.ServiceResult accepted = Resource360Service.decideStaffingRequest(first.recordId, true, 'Revalidated', 'ignored-client-role');

        System.assertEquals('Accepted', [SELECT State__c FROM Staffing_Request__c WHERE Id=:first.recordId].State__c);
        System.assertEquals('Declined', [SELECT State__c FROM Staffing_Request__c WHERE Id=:competing.recordId].State__c,
            'An impossible competing soft request must close when capacity becomes committed.');
        System.assertEquals(1, [SELECT COUNT() FROM Allocation__c WHERE Id=:accepted.recordId AND Current__c=true AND State__c='Accepted']);
        System.assert([SELECT COUNT() FROM R360_Audit_Event__c WHERE Entity_ID__c=:String.valueOf(accepted.recordId)] > 0);
        Resource360Service.ServiceResult modified=Resource360Service.modifyAllocation(accepted.recordId,startDate,endDate,3,'MuleSoft Lead','Billing',null,null,'Approved delivery-plan change.');
        System.assertEquals(2,[SELECT Version__c FROM Allocation__c WHERE Id=:modified.recordId].Version__c);
        Resource360Service.ServiceResult ended=Resource360Service.deallocate(modified.recordId,endDate.addDays(-1),'Controlled early release.');
        Allocation__c shortened=[SELECT State__c,End_Date__c FROM Allocation__c WHERE Id=:ended.recordId];System.assertEquals('Accepted',shortened.State__c);System.assertEquals(endDate.addDays(-1),shortened.End_Date__c);
    }

    @IsTest
    static void governedBudgetUsesSequentialSeparationOfDutiesAndInvalidatesChanges() {
        Profile adminProfile = [SELECT Id FROM Profile WHERE Name='System Administrator'];
        List<User> approvers = new List<User>();
        for (Integer index = 1; index <= 3; index++) approvers.add(testUser(adminProfile.Id, 'appr' + index));
        insert approvers;
        Id adminPermissionSetId=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Administrator'].Id;
        List<PermissionSetAssignment> assignments=new List<PermissionSetAssignment>();
        for(User approver:approvers)assignments.add(new PermissionSetAssignment(AssigneeId=approver.Id,PermissionSetId=adminPermissionSetId));
        insert assignments;

        User submitter = [SELECT Id FROM User WHERE Id=:UserInfo.getUserId()];
        Engagement__c engagement = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        Budget__c budget;
        System.runAs(submitter) {
            budget = new Budget__c(
                Engagement__c=engagement.Id, Version__c=99, Current__c=true, State__c='Draft', Revenue__c=10000000,
                Base_Labour__c=8500000, Uplift_Percent__c=0, Effort_Contingency_Percent__c=0,
                Expense_Contingency_Percent__c=0, Travel_Rate__c=0, Onsite_Months__c=0,
                Planned_Hours__c=100, Idempotency_Key__c='TEST-BUDGET-LOW-MARGIN'
            );
            insert budget;
            insert new Budget_Line__c(
                Budget__c=budget.Id, Phase__c='Deliver', Work_Unit__c='Controlled WBS', Role__c='Salesforce Architect',
                Location__c='India', Period_Start__c=Date.newInstance(Date.today().year(), Date.today().month(), 1),
                Planned_Hours__c=100, Allocation_Percent__c=100, Cost_Rate__c=1, Onsite__c=false
            );
            Resource360Service.submitBudget(budget.Id);
        }
        System.assertEquals('Pending Approval', [SELECT State__c FROM Budget__c WHERE Id=:budget.Id].State__c);

        System.runAs(approvers[0]) {
            Resource360Service.decideBudget(budget.Id, true, 'Portfolio control passed.', 'forged-role-is-ignored');
            try {
                Resource360Service.decideBudget(budget.Id, true, 'Attempting two levels.', 'GM/COO Delegate');
                System.assert(false, 'The same identity cannot approve two levels.');
            } catch (AuraHandledException expected) {
                System.assertNotEquals(null, expected.getMessage());
            }
        }
        System.runAs(approvers[1]) {
            Resource360Service.decideBudget(budget.Id, true, 'HOD control passed.', 'ignored');
        }
        System.runAs(approvers[2]) {
            Resource360Service.decideBudget(budget.Id, true, 'Executive control passed.', 'ignored');
        }
        System.assertEquals('Approved', [SELECT State__c FROM Budget__c WHERE Id=:budget.Id].State__c);
        System.assertEquals(3, [SELECT COUNT() FROM R360_Approval_Decision__c WHERE Entity_ID__c=:String.valueOf(budget.Id) AND State__c='Approved']);
        R360_Approval_Decision__c completed=[SELECT Id,Decision_Note__c FROM R360_Approval_Decision__c WHERE Entity_ID__c=:String.valueOf(budget.Id) AND State__c='Approved' LIMIT 1];
        try{completed.Decision_Note__c='Mutated';update completed;System.assert(false,'Completed decisions are immutable.');}catch(DmlException expected){System.assertNotEquals(null,expected.getMessage());}

        System.runAs(submitter) {
            budget = [SELECT Id, Base_Labour__c FROM Budget__c WHERE Id=:budget.Id];
            budget.Base_Labour__c += 1;
            update budget;
        }
        Budget__c invalidated = [SELECT State__c, Economic_Signature__c FROM Budget__c WHERE Id=:budget.Id];
        System.assertEquals('Invalidated', invalidated.State__c);
        System.assertEquals(null, invalidated.Economic_Signature__c);
        Budget__c approvedDemo=[SELECT Id FROM Budget__c WHERE Idempotency_Key__c='DEMO-BUDGET-1001'];
        Budget_Line__c approvedLine=[SELECT Id,Cost_Rate__c FROM Budget_Line__c WHERE Budget__c=:approvedDemo.Id LIMIT 1];
        System.runAs(submitter){approvedLine.Cost_Rate__c+=1;update approvedLine;}
        System.assertEquals('Invalidated',[SELECT State__c FROM Budget__c WHERE Id=:approvedDemo.Id].State__c);
        Resource360Service.ServiceResult versioned;System.runAs(submitter){versioned=Resource360Service.createBudgetVersion(budget.Id);}
        System.assertEquals('Draft',[SELECT State__c FROM Budget__c WHERE Id=:versioned.recordId].State__c);
        System.assertEquals(1,[SELECT COUNT() FROM Budget_Line__c WHERE Budget__c=:versioned.recordId]);
    }

    @IsTest
    static void skillsCredentialsAndSelfApprovalControlsWork() {
        Resource__c owner = [SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-018462'];
        Resource__c report = [SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-019830'];
        Capability__c capability = [SELECT Id FROM Capability__c WHERE Capability_ID__c='CAP-DATA-CLOUD'];

        Resource360Service.ServiceResult selfClaim = Resource360Service.submitSkillClaim(
            owner.Id, capability.Id, 3, 4, 'Sanitized architecture evidence.', 'TEST-CLAIM-SELF'
        );
        try {
            Resource360Service.decideSkillClaim(selfClaim.recordId, true, 3, 'Self approval attempt.');
            System.assert(false, 'A practitioner must not approve their own claim.');
        } catch (AuraHandledException expected) {
            System.assertNotEquals(null, expected.getMessage());
        }

        Resource360Service.ServiceResult teamClaim = Resource360Service.submitSkillClaim(
            report.Id, capability.Id, 3, 2, 'Sanitized project delivery evidence.', 'TEST-CLAIM-TEAM'
        );
        Resource360Service.decideSkillClaim(teamClaim.recordId, true, 3, 'Evidence matches the governed rubric.');
        System.assertEquals('Approved', [SELECT State__c FROM Skill_Claim__c WHERE Id=:teamClaim.recordId].State__c);

        Resource360Service.ServiceResult submittedCredential = Resource360Service.addCredential(
            owner.Id, 'TEST-CRED-001', 'Salesforce AI Associate', 'Salesforce', Date.today().addDays(-30),
            Date.today().addYears(1), 'https://example.invalid/sanitized-evidence'
        );
        Resource360Service.verifyCredential(submittedCredential.recordId, 'Verified', 'Salesforce Credential Gateway', 'Verified test evidence.');
        Credential__c verified = [SELECT State__c, Verification_Source__c, Last_Checked_At__c FROM Credential__c WHERE Id=:submittedCredential.recordId];
        System.assertEquals('Verified', verified.State__c);
        System.assertNotEquals(null, verified.Last_Checked_At__c);
    }

    @IsTest
    static void timeUsesEligibleAllocationsAndControlledCorrections() {
        Staffing_Request__c pending = [SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];
        Id allocationId = Resource360Service.decideStaffingRequest(pending.Id, true, 'Capacity revalidated.', 'ignored').recordId;
        Allocation__c allocation = [SELECT Id, Resource__c, Start_Date__c, End_Date__c, Daily_Hours__c FROM Allocation__c WHERE Id=:allocationId];
        Date weekStart = nextMonday(allocation.Start_Date__c);
        if (weekStart > allocation.End_Date__c) weekStart = mondayFor(allocation.Start_Date__c);
        Date workDate = weekStart;

        Resource360Service.ServiceResult timesheet = Resource360Service.createTimesheet(allocation.Resource__c, weekStart);
        Resource360Service.ServiceResult entry = Resource360Service.saveTimeEntry(timesheet.recordId, allocation.Id, workDate, 4, null, 'Delivery work.');
        try {
            Resource360Service.saveTimeEntry(timesheet.recordId, allocation.Id, workDate, 5, null, 'Over the allocation.');
            System.assert(false, 'Hours above the eligible allocation must fail.');
        } catch (AuraHandledException expected) {
            System.assertNotEquals(null, expected.getMessage());
        }
        Resource360Service.submitTimesheet(timesheet.recordId);
        Resource360Service.decideTimesheet(timesheet.recordId, true, 'Approved against allocation.');

        try {
            Time_Entry__c approvedEntry = [SELECT Id, Comment__c FROM Time_Entry__c WHERE Id=:entry.recordId];
            approvedEntry.Comment__c = 'Direct mutation is forbidden.';
            update approvedEntry;
            System.assert(false, 'Approved entries are immutable.');
        } catch (DmlException expected) {
            System.assertNotEquals(null,expected.getMessage());
        }

        Resource360Service.ServiceResult correction = Resource360Service.createTimeCorrection(timesheet.recordId, 'Customer billing correction.');
        System.assertEquals('Draft', [SELECT Status__c FROM Timesheet__c WHERE Id=:correction.recordId].Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Time_Entry__c WHERE Timesheet__c=:correction.recordId AND Correction_Parent__c=:entry.recordId]);
        System.assertEquals(false, [SELECT Current__c FROM Timesheet__c WHERE Id=:timesheet.recordId].Current__c);
    }

    @IsTest
    static void inboundContractIsPartialSuccessAndIdempotentWithoutRawPayloads() {
        RestRequest request = new RestRequest();
        request.requestUri='/services/apexrest/resource360/v1/master-data/employees';
        request.httpMethod='POST';
        request.requestBody=Blob.valueOf(JSON.serialize(new Map<String,Object>{
            'runId'=>'TEST-INBOUND-001', 'sourceSystem'=>'EXL HRMS', 'entityType'=>'Employee', 'contractVersion'=>'R360-MOCK-1.2',
            'sourceCutoff'=>'2026-08-22T00:00:00Z',
            'records'=>new List<Object>{
                new Map<String,Object>{'employeeId'=>'INBOUND-001','preferredName'=>'Integration User','employmentStart'=>'2025-01-01','status'=>'Active','tower'=>'Delivery','dailyCapacityHours'=>8},
                new Map<String,Object>{'employeeId'=>'INBOUND-INVALID','status'=>'Active'}
            }
        }));
        RestContext.request=request;RestContext.response=new RestResponse();
        Resource360InboundApi.ApiResponse first=Resource360InboundApi.ingest();
        System.assertEquals('Partial',first.state,first.message);System.assertEquals(1,first.succeeded);System.assertEquals(1,first.failed);
        System.assertEquals(207,RestContext.response.statusCode);
        System.assertEquals(1,[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c='INBOUND-001']);
        System.assertEquals(1,[SELECT COUNT() FROM R360_Integration_Error__c WHERE Integration_Run__r.Run_ID__c='TEST-INBOUND-001' AND Payload_Hash__c!=null]);

        RestContext.request=request;RestContext.response=new RestResponse();
        Resource360InboundApi.ApiResponse duplicate=Resource360InboundApi.ingest();
        System.assertEquals(first.state,duplicate.state);System.assertEquals(first.processed,duplicate.processed);
        System.assertEquals(1,[SELECT COUNT() FROM R360_Integration_Run__c WHERE Run_ID__c='TEST-INBOUND-001']);

        Resource360InboundApi.ApiResponse capabilityRun=ingest('TEST-INBOUND-CAP','Capability',new List<Object>{new Map<String,Object>{'capabilityId'=>'INBOUND-CAP-001','name'=>'Agentforce Delivery','type'=>'Salesforce','tower'=>'Platform','active'=>true}});
        Resource360InboundApi.ApiResponse orgRun=ingest('TEST-INBOUND-ORG','OrgUnit',new List<Object>{new Map<String,Object>{'orgUnitId'=>'INBOUND-ORG-001','name'=>'Salesforce Delivery','unitType'=>'COE','effectiveFrom'=>'2025-01-01','current'=>true}});
        Resource360InboundApi.ApiResponse portfolioRun=ingest('TEST-INBOUND-PORT','Portfolio',new List<Object>{new Map<String,Object>{'portfolioId'=>'INBOUND-PORT-001','name'=>'Salesforce Growth','effectiveFrom'=>'2025-01-01','current'=>true}});
        System.assert(capabilityRun.success&&orgRun.success&&portfolioRun.success);
    }

    @IsTest
    static void schedulerTalentWorkspaceAndSharingAreOperational() {
        Staffing_Request__c pending=[SELECT Id,SLA_Due__c FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];
        pending.SLA_Due__c=System.now().addMinutes(-1);update pending;
        Resource__c owner=[SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-018462'];
        insert new Credential__c(Resource__c=owner.Id,Credential_ID__c='TEST-EXPIRED-001',Credential_Name__c='Expired Certification',Issuer__c='Salesforce',State__c='Verified',Issue_Date__c=Date.today().addYears(-2),Expiry_Date__c=Date.today().addDays(-1));
        Engagement__c engagement=[SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];Allocation__c unbilled=new Allocation__c(Originating_Request__c=pending.Id,Resource__c=owner.Id,Engagement__c=engagement.Id,Role__c='Salesforce Architect',Classification__c='IFB/PO Awaited',Billable_Snapshot__c=false,Start_Date__c=Date.today().addDays(-15),End_Date__c=Date.today().addDays(30),Daily_Hours__c=1,State__c='Accepted',Version__c=1,Current__c=true,Responsible_Owner__c=UserInfo.getUserId(),Review_Date__c=Date.today().addDays(1),Control_Reason__c='Test effective-dated escalation.');insert unbilled;

        Test.startTest();
        new Resource360OperationsScheduler().execute(null);
        Test.stopTest();
        System.assertEquals('Expired',[SELECT State__c FROM Staffing_Request__c WHERE Id=:pending.Id].State__c);
        System.assertEquals('Expired',[SELECT State__c FROM Credential__c WHERE Credential_ID__c='TEST-EXPIRED-001'].State__c);
        System.assert([SELECT COUNT() FROM R360_Integration_Run__c WHERE Entity_Type__c='Operational Controls' AND State__c='Succeeded']>0);
        String escalationCorrelation='UNBILLED-'+unbilled.Id+'-14';System.assertEquals(1,[SELECT COUNT() FROM R360_Outbox_Event__c WHERE Correlation_ID__c=:escalationCorrelation AND Event_Type__c='NOTIFICATION_REQUESTED']);
    }

    @IsTest
    static void talentWorkspaceAndSharingAreOperational(){
        Capability__c capability=[SELECT Id FROM Capability__c WHERE Capability_ID__c='CAP-DATA-CLOUD'];
        List<Resource360TalentService.Candidate> candidates=Resource360TalentService.searchCandidates(capability.Id,4,'Data Cloud Architect',Date.today(),Date.today().addDays(5),2,'Data & AI','Bengaluru',10);
        System.assert(!candidates.isEmpty());System.assert(candidates[0].explanation.contains('R360-POLICY-2.0'));
        String criteria=JSON.serialize(new Map<String,Object>{'mode'=>'rank','startDate'=>Date.today(),'endDate'=>Date.today().addDays(5),'dailyHours'=>2,'requestedRole'=>'Data Cloud Architect','industry'=>'Retail','minimumExperience'=>3,'preferredCredentials'=>new List<String>{'Data Cloud'},'capabilityRequirements'=>new List<Object>{new Map<String,Object>{'capabilityId'=>capability.Id,'minimumLevel'=>4,'mandatory'=>true}}});
        List<Resource360TalentService.Candidate>ranked=Resource360TalentService.searchCandidatesV2(criteria);System.assert(!ranked.isEmpty());System.assert(ranked[0].score>0);System.assert(ranked[0].eligible);
        String workspace=Resource360Service.getWorkspaceData();
        System.assert(workspace.contains('activeRoles'));System.assert(workspace.contains('integrationRuns'));System.assert(workspace.contains('integrationErrors'));System.assert(workspace.contains('utilizationPercent'));
        System.assert(workspace.contains('deliveryRoles'));System.assert(workspace.contains('learningAchievements'));System.assert(workspace.contains('projectEvidence'));
        Test.startTest();Resource360ScopeSharingService.rebuildUser(UserInfo.getUserId());Test.stopTest();
    }

    @IsTest
    static void exceptionFreeOverdueTimeAutoApprovesUnderPolicy(){
        Staffing_Request__c pending=[SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];
        Id allocationId=Resource360Service.decideStaffingRequest(pending.Id,true,'Capacity revalidated.','ignored').recordId;
        Allocation__c allocation=[SELECT Id,Resource__c,Start_Date__c FROM Allocation__c WHERE Id=:allocationId];
        Date weekStart=nextMonday(allocation.Start_Date__c);
        Id timesheetId=Resource360Service.createTimesheet(allocation.Resource__c,weekStart).recordId;
        Resource360Service.saveTimeEntry(timesheetId,allocation.Id,weekStart,4,null,'Eligible delivery time.');
        Resource360Service.submitTimesheet(timesheetId);
        Timesheet__c overdue=[SELECT Id,Submitted_At__c,Decision_Due_At__c FROM Timesheet__c WHERE Id=:timesheetId];overdue.Submitted_At__c=System.now().addDays(-8);overdue.Decision_Due_At__c=System.now().addDays(-3);update overdue;
        Test.startTest();new Resource360OperationsScheduler().execute(null);Test.stopTest();
        Timesheet__c approved=[SELECT Status__c,Auto_Approved__c,Exception_Code__c,Decision_Note__c FROM Timesheet__c WHERE Id=:timesheetId];
        System.assertEquals('Approved',approved.Status__c);System.assertEquals(true,approved.Auto_Approved__c);System.assertEquals(null,approved.Exception_Code__c);System.assert(approved.Decision_Note__c.contains('Auto-approved'));
        System.assertEquals(1,[SELECT COUNT() FROM Time_Entry__c WHERE Timesheet__c=:timesheetId AND State__c='Approved']);
    }

    @IsTest
    static void unprivilegedIdentityCannotForgeAStafferRole() {
        Profile standardProfile=[SELECT Id FROM Profile WHERE Name='Standard User'];
        User standardUser=testUser(standardProfile.Id,'negative');insert standardUser;
        Staffing_Request__c pending=[SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];
        System.runAs(standardUser){
            try{
                Resource360Service.decideStaffingRequest(pending.Id,false,'Forged decision.','COE Staffer');
                System.assert(false,'A client-supplied role must never grant authority.');
            }catch(AuraHandledException expected){System.assertNotEquals(null,expected.getMessage());}
        }
    }

    @IsTest
    static void demoSeedRemainsCompactAndIdempotent() {
        Integer beforeCount=[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'EXL-%'];
        Resource360Service.ServiceResult first=Resource360DemoData.seed();
        Resource360Service.ServiceResult second=Resource360DemoData.seed();
        System.assert(first.success);System.assert(second.success);
        System.assertEquals(beforeCount,[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'EXL-%']);
        System.assertEquals(3,beforeCount);System.assertEquals(2,[SELECT COUNT() FROM Engagement__c WHERE Engagement_ID__c LIKE 'ENG-%']);
    }

    @IsTest
    static void immutableAuditPolicyFallbackAndOutboxRetriesAreCovered(){
        System.assertEquals(8,Resource360Policy.numberValue('Default_Daily_Capacity'));
        System.assertEquals(77,Resource360Policy.numberValue('Missing_Policy',77));
        System.assertEquals('fallback',Resource360Policy.textValue('Missing_Text_Policy','fallback'));
        R360_Audit_Event__c audit=[SELECT Id,Detail__c FROM R360_Audit_Event__c LIMIT 1];
        try{audit.Detail__c='Mutation';update audit;System.assert(false,'Audit evidence is immutable.');}catch(DmlException expected){System.assertNotEquals(null,expected.getMessage());}
        try{delete audit;System.assert(false,'Audit evidence cannot be deleted.');}catch(DmlException expected){System.assertNotEquals(null,expected.getMessage());}
        R360_Outbox_Event__c retry=new R360_Outbox_Event__c(Attempt_Count__c=0);
        Resource360OutboxPublisher.applyFailure(retry,'Transient publication failure');System.assertEquals('Retry Pending',retry.State__c);
        retry.Attempt_Count__c=3;Resource360OutboxPublisher.applyFailure(retry,'Permanent publication failure');System.assertEquals('Dead Letter',retry.State__c);
        new Resource360OutboxPublisher().execute(null);
    }

    @IsTest
    static void classificationPolicyIsEffectiveDatedAndServerGoverned(){
        List<String>activeValues=Resource360Classification.activeValues();
        System.assert(activeValues.contains('Billing'));
        System.assert(activeValues.contains('Contractual Shadow'));
        System.assertEquals(true,Resource360Classification.isBillable('Billing'));
        System.assertEquals(false,Resource360Classification.isBillable('WAR'));
        System.assertEquals(true,Resource360Classification.requiresControl('WAR'));
        System.assertEquals(true,Resource360Classification.requiresSow('Contractual Shadow'));
        System.assertEquals(false,Resource360Classification.requiresSow('Billing'));
        try{Resource360Classification.requireActive('Unknown classification');System.assert(false,'Inactive or unknown classifications must fail closed.');}catch(AuraHandledException expected){System.assertNotEquals(null,expected.getMessage());}
        List<Resource360RoleCatalog.DeliveryRole>roles=Resource360RoleCatalog.activeRoles();System.assert(roles.size()>=20);System.assertEquals('Data Cloud Architect',Resource360RoleCatalog.requireActive('R360-ROLE-DCA'));
        System.assertEquals('Solution Architect',Resource360RoleCatalog.requireActive('R360-ROLE-SA'));System.assertEquals('Scrum Master',Resource360RoleCatalog.requireActive('R360-ROLE-SM'));
        try{Resource360RoleCatalog.requireActive('Uncontrolled role');System.assert(false,'Unknown delivery roles must fail closed.');}catch(AuraHandledException expected){System.assertNotEquals(null,expected.getMessage());}
    }

    @IsTest
    static void planningModesCalendarDeadlineAndSplitLineageAreGoverned(){
        Staffing_Request__c pending=[SELECT Id,Resource__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];
        Resource360PlanningService.PlanningPreview daily=Resource360PlanningService.preview(pending.Resource__c,pending.Start_Date__c,pending.End_Date__c,'Daily Hours',4,null,false,null);
        System.assert(daily.allowed,daily.message);System.assert(daily.workingDays>0);System.assertEquals(4,daily.requestedDailyHours);System.assert(daily.pendingHours>0,'Pending soft demand must remain visible in context.');
        Resource360PlanningService.PlanningPreview percent=Resource360PlanningService.preview(pending.Resource__c,pending.Start_Date__c,pending.End_Date__c,'Allocation Percent',50,null,false,null);
        System.assertEquals(50,percent.allocationPercent);System.assertEquals(4,percent.requestedDailyHours);
        Resource360PlanningService.PlanningPreview total=Resource360PlanningService.preview(pending.Resource__c,pending.Start_Date__c,pending.End_Date__c,'Total Hours',40,null,false,null);
        System.assertEquals(40,total.requestedTotalHours);System.assert(total.requestedDailyHours>0);

        Resource__c resource=[SELECT Id,Work_Calendar__c FROM Resource__c WHERE Id=:pending.Resource__c];
        Date friday=nextMonday(Date.today().addDays(1)).addDays(4);Date holiday=friday.addDays(3);
        insert new R360_Calendar_Exception__c(Calendar__c=resource.Work_Calendar__c,Exception_Key__c='TEST-HOLIDAY-'+String.valueOf(holiday),Exception_Date__c=holiday,Capacity_Hours__c=0,Reason__c='Test regional holiday');
        Resource360CalendarService.Deadline deadline=Resource360CalendarService.deadline(resource.Id,friday,2,Time.newInstance(18,0,0,0));
        System.assertEquals(holiday.addDays(2),deadline.dueDate,'Weekend and configured holiday must be skipped.');System.assertEquals('Asia/Kolkata',deadline.timeZoneName);

        Id allocationId=Resource360Service.decideStaffingRequest(pending.Id,true,'Capacity revalidated.','ignored').recordId;
        Allocation__c allocation=[SELECT Id,Start_Date__c,End_Date__c,Daily_Hours__c FROM Allocation__c WHERE Id=:allocationId];
        List<Resource360CalendarService.CapacityDay> profile=Resource360CalendarService.capacityProfile(pending.Resource__c,allocation.Start_Date__c,allocation.End_Date__c);
        Date firstWorking;Date splitDate;
        for(Resource360CalendarService.CapacityDay day:profile){if(day.workingDay&&firstWorking==null)firstWorking=day.workDate;else if(day.workingDay&&firstWorking!=null){splitDate=day.workDate;break;}}
        System.assertNotEquals(null,splitDate,'Demo allocation must contain at least two working days.');
        Resource360Service.ServiceResult split=Resource360Service.splitAllocation(allocation.Id,splitDate,3,4,'Approved phase transition.');
        System.assert(split.success);System.assertEquals('Superseded',[SELECT State__c FROM Allocation__c WHERE Id=:allocation.Id].State__c);
        List<Allocation__c> segments=[SELECT Start_Date__c,End_Date__c,Daily_Hours__c,Current__c,Parent_Allocation__c FROM Allocation__c WHERE Parent_Allocation__c=:allocation.Id ORDER BY Start_Date__c];
        System.assertEquals(2,segments.size());System.assertEquals(splitDate.addDays(-1),segments[0].End_Date__c);System.assertEquals(splitDate,segments[1].Start_Date__c);System.assert(segments[0].Current__c&&segments[1].Current__c);
    }

    @IsTest
    static void budgetDraftEditorReconcilesWbsAndProtectsHistory(){
        Budget__c source=[SELECT Id,Revenue__c FROM Budget__c WHERE Idempotency_Key__c='DEMO-BUDGET-1001'];
        Id draftId=Resource360Service.createBudgetVersion(source.Id).recordId;
        Resource360Service.saveBudgetDraft(draftId,85000000,4,2,1,150000,4);
        Budget__c draft=[SELECT Id,Engagement__r.Start_Date__c FROM Budget__c WHERE Id=:draftId];
        Date periodStart=Date.newInstance(draft.Engagement__r.Start_Date__c.year(),draft.Engagement__r.Start_Date__c.month(),1);
        AggregateResult priorTotals=[SELECT SUM(Planned_Hours__c) total FROM Budget_Line__c WHERE Budget__c=:draftId];Decimal priorHours=(Decimal)priorTotals.get('total');if(priorHours==null)priorHours=0;
        Resource360Service.ServiceResult savedLine=Resource360Service.saveBudgetLine(draftId,null,periodStart,'Discover','Architecture','Salesforce Technical Architect','India',40,100,50,false);
        System.assert(savedLine.success);Budget__c reconciled=[SELECT Revenue__c,Uplift_Percent__c,Planned_Hours__c,Base_Labour__c FROM Budget__c WHERE Id=:draftId];
        System.assertEquals(85000000,reconciled.Revenue__c);System.assertEquals(4,reconciled.Uplift_Percent__c);System.assertEquals(priorHours+40,reconciled.Planned_Hours__c);System.assert(reconciled.Base_Labour__c>0);

        source=[SELECT Id,Revenue__c,Current__c FROM Budget__c WHERE Id=:source.Id];System.assertEquals(false,source.Current__c);source.Revenue__c+=1;
        try{update source;System.assert(false,'Historical budget economics must be immutable.');}catch(DmlException expected){System.assert(expected.getMessage().contains('Historical budget versions'));}
        Budget_Line__c historicalLine=[SELECT Id,Budget__c,Role__c FROM Budget_Line__c WHERE Budget__c=:source.Id LIMIT 1];historicalLine.Role__c='Mutated role';
        try{update historicalLine;System.assert(false,'Historical budget WBS must be immutable.');}catch(DmlException expected){System.assertNotEquals(null,expected.getMessage());}
        System.assertNotEquals('Mutated role',[SELECT Role__c FROM Budget_Line__c WHERE Id=:historicalLine.Id].Role__c);
    }

    @IsTest
    static void bulkOperationsPrevalidateCommitAndBlockReplayOrAtomicErrors(){
        String mixedRows=JSON.serialize(new List<Object>{
            new Map<String,Object>{'employeeId'=>'BULK-EMP-001','preferredName'=>'Controlled Import','employmentStart'=>'2026-01-01','tower'=>'Delivery','status'=>'Active','dailyCapacityHours'=>8},
            new Map<String,Object>{'employeeId'=>'BULK-EMP-INVALID','employmentStart'=>'not-a-date','tower'=>'Delivery'}
        });
        Resource360BulkService.BulkPreview preview=Resource360BulkService.preview('Employee',mixedRows);
        System.assertEquals(false,preview.valid);System.assertEquals(2,preview.totalRows);System.assertEquals(1,preview.validRows);System.assertEquals(1,preview.invalidRows);System.assert(preview.rows[1].message.contains('preferredName is required'));
        try{Resource360BulkService.executeBatch('Employee',mixedRows,'employees.csv','Atomic');System.assert(false,'Atomic batch with row errors must be blocked before DML.');}catch(AuraHandledException expected){System.assertNotEquals(null,expected.getMessage());}
        Resource360Service.ServiceResult committed=Resource360BulkService.executeBatch('Employee',mixedRows,'employees.csv','Partial');System.assert(committed.success,committed.message);
        System.assertEquals(1,[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c='BULK-EMP-001']);
        R360_Integration_Run__c run=[SELECT Id,Run_ID__c,State__c,Processed_Count__c,Success_Count__c,Failure_Count__c,Source_File_Name__c,Source_File_Hash__c,Commit_Mode__c FROM R360_Integration_Run__c WHERE Id=:committed.recordId];
        System.assertEquals('Succeeded',run.State__c);System.assertEquals(1,run.Processed_Count__c);System.assertEquals('employees.csv',run.Source_File_Name__c);System.assertEquals('Partial',run.Commit_Mode__c);System.assertEquals(64,run.Source_File_Hash__c.length());
        Resource360Service.ServiceResult replay=Resource360BulkService.executeBatch('Employee',mixedRows,'employees.csv','Partial');System.assertEquals(run.Id,replay.recordId);System.assertEquals(1,[SELECT COUNT() FROM R360_Integration_Run__c WHERE Run_ID__c=:run.Run_ID__c]);
        Resource360BulkService.BulkPreview unsafe=Resource360BulkService.preview('Capability','[{"capabilityId":"BULK-CAP-001","name":"=HYPERLINK(1)","type":"Salesforce"}]');System.assertEquals(false,unsafe.valid);System.assert(unsafe.rows[0].message.contains('Formula-like'));
    }

    @IsTest
    static void configurationControlPlaneVersionsValidatesAndRollsBack(){
        Date today=Resource360Policy.effectiveDate();
        Profile adminProfile=[SELECT Id FROM Profile WHERE Name='System Administrator'];User configApprover=testUser(adminProfile.Id,'cfgappr');insert configApprover;Id configApproverSet=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Configuration_Approver_Actions'].Id;insert new PermissionSetAssignment(AssigneeId=configApprover.Id,PermissionSetId=configApproverSet);
        Resource360ConfigurationService.ConfigurationPreview weightPreview=Resource360ConfigurationService.preview('Policy','Talent_Weight_Capability','Capability score weight','Number',40,null,false,null,'percent',today,null,'Tune explainable matching based on approved COE evidence.');
        System.assert(weightPreview.valid);System.assert(!weightPreview.warnings.isEmpty(),'A non-100 aggregate should be normalized with an explicit warning.');
        Resource360ConfigurationService.ConfigurationPreview unsafe=Resource360ConfigurationService.preview('Integration','Unregistered_Connector','Unsafe connector','Text',null,'client_secret=forbidden',false,null,null,today,null,'Negative security test.');
        System.assertEquals(false,unsafe.valid);System.assert(String.join(unsafe.errors,' ').contains('prohibited'));

        Resource360Service.ServiceResult first=Resource360ConfigurationService.saveDraft(null,'Policy','Staffing_Expiry_Hours','Staffing expiry','Number',96,null,false,null,'hours',today,null,'Approved EXL Salesforce COE staffing SLA change.');
        Resource360ConfigurationService.submit(first.recordId);Boolean selfApprovalBlocked=false;try{Resource360ConfigurationService.decide(first.recordId,true,'Invalid self approval.');}catch(AuraHandledException expected){selfApprovalBlocked=true;}System.assert(selfApprovalBlocked,'Configuration activation requires a different identity.');System.runAs(configApprover){Resource360ConfigurationService.decide(first.recordId,true,'Control owner approval.');}Resource360ConfigurationService.clearCache();
        System.assertEquals(96,Resource360Policy.numberValue('Staffing_Expiry_Hours',72));
        Resource360Service.ServiceResult second=Resource360ConfigurationService.saveDraft(null,'Policy','Staffing_Expiry_Hours','Staffing expiry','Number',120,null,false,null,'hours',today,null,'Second governed SLA version.');
        Resource360ConfigurationService.submit(second.recordId);System.runAs(configApprover){Resource360ConfigurationService.decide(second.recordId,true,'Second control owner approval.');}Resource360ConfigurationService.clearCache();
        System.assertEquals(120,Resource360Policy.numberValue('Staffing_Expiry_Hours',72));
        System.runAs(configApprover){Resource360ConfigurationService.rollback(first.recordId,'Operational evidence requires the prior 96-hour SLA.');}Resource360ConfigurationService.clearCache();
        List<R360_Configuration__c> restored=[SELECT State__c,Current__c,Version__c,Value_Type__c,Numeric_Value__c,Effective_From__c,Effective_To__c FROM R360_Configuration__c WHERE Configuration_Key__c='POLICY.Staffing_Expiry_Hours' ORDER BY Version__c DESC];System.assertEquals(3,restored.size(),'Rollback must create a third version.');System.assertEquals('Active',restored[0].State__c,'Newest rollback version must be active.');System.assertEquals(96,restored[0].Numeric_Value__c,'Rollback must copy the selected prior numeric value.');System.assert(restored[0].Effective_From__c<=Resource360Policy.effectiveDate(),'Rollback version must be effective now.');
        System.assertEquals(96,Resource360Policy.numberValue('Staffing_Expiry_Hours',72));
        System.assertEquals(3,[SELECT COUNT() FROM R360_Configuration__c WHERE Configuration_Key__c='POLICY.Staffing_Expiry_Hours']);

        Resource360Service.ServiceResult lov=Resource360ConfigurationService.saveDraft(null,'General LOV','Hypercare','Hypercare','Boolean',null,null,true,'{"listKey":"Budget_Phases"}',null,today,null,'Add a controlled delivery phase.');
        Resource360ConfigurationService.submit(lov.recordId);System.runAs(configApprover){Resource360ConfigurationService.decide(lov.recordId,true,'Phase governance approved.');}Resource360ConfigurationService.clearCache();
        System.assert(Resource360ConfigurationService.lookupValues('Budget_Phases',new List<String>{'Deliver'}).contains('Hypercare'));
        Resource360Service.ServiceResult role=Resource360ConfigurationService.saveDraft(null,'Delivery Role','R360-ROLE-CPQ','Revenue Cloud Architect','Boolean',null,null,true,'{"tower":"Revenue Cloud"}',null,today,null,'Add a governed Salesforce delivery role.');
        Resource360ConfigurationService.submit(role.recordId);System.runAs(configApprover){Resource360ConfigurationService.decide(role.recordId,true,'COE taxonomy owner approved.');}Resource360ConfigurationService.clearCache();
        System.assertEquals('Revenue Cloud Architect',Resource360RoleCatalog.requireActive('R360-ROLE-CPQ'));
        Resource360Service.ServiceResult classification=Resource360ConfigurationService.saveDraft(null,'Classification','Innovation Lab','Innovation Lab','Boolean',null,null,true,'{"billable":false,"requiresControl":true,"requiresSow":false,"defaultReviewDays":21,"escalationPolicy":"Operations day 21"}',null,today,null,'Add controlled innovation classification.');
        Resource360ConfigurationService.submit(classification.recordId);System.runAs(configApprover){Resource360ConfigurationService.decide(classification.recordId,true,'Classification owner approved.');}Resource360ConfigurationService.clearCache();
        System.assert(Resource360Classification.requiresControl('Innovation Lab'));System.assertEquals(false,Resource360Classification.isBillable('Innovation Lab'));
        System.assert(Resource360ConfigurationService.catalog().size()>53);
    }

    @IsTest
    static void configurationReleaseActivatesAtomicallyWithIndependentApprover(){
        Date today=Resource360Policy.effectiveDate();Profile adminProfile=[SELECT Id FROM Profile WHERE Name='System Administrator'];User configApprover=testUser(adminProfile.Id,'relappr');insert configApprover;Id configApproverSet=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Configuration_Approver_Actions'].Id;insert new PermissionSetAssignment(AssigneeId=configApprover.Id,PermissionSetId=configApproverSet);
        String releaseKey='EXL-MOCK-ATOMIC-R1';Resource360Service.ServiceResult releaseA=Resource360ConfigurationService.saveDraft(null,'Policy','Release_Test_A','Release test A','Text',null,'alpha',false,null,null,today,null,'Atomic configuration release test A.');Resource360Service.ServiceResult releaseB=Resource360ConfigurationService.saveDraft(null,'Policy','Release_Test_B','Release test B','Text',null,'beta',false,null,null,today,null,'Atomic configuration release test B.');Resource360ConfigurationService.assignRelease(releaseA.recordId,releaseKey);Resource360ConfigurationService.assignRelease(releaseB.recordId,releaseKey);Resource360ConfigurationService.ReleasePreview releasePreview=Resource360ConfigurationService.previewRelease(releaseKey);System.assert(releasePreview.valid,String.join(releasePreview.errors,' '));System.assertEquals(2,releasePreview.itemCount);Resource360ConfigurationService.submitRelease(releaseKey);Boolean releaseSelfApprovalBlocked=false;try{Resource360ConfigurationService.decideRelease(releaseKey,true,'Invalid self approval.');}catch(AuraHandledException expected){releaseSelfApprovalBlocked=true;}System.assert(releaseSelfApprovalBlocked,'Atomic configuration releases require an independent approver.');System.runAs(configApprover){Resource360ConfigurationService.decideRelease(releaseKey,true,'Independent atomic release approval.');}System.assertEquals(2,[SELECT COUNT() FROM R360_Configuration__c WHERE Release_Key__c=:releaseKey AND State__c='Active' AND Current__c=true]);
    }

    @IsTest
    static void sourceFreshnessPoliciesFailClosedAtBusinessDecisions(){
        Resource__c resource=[SELECT Id,Source_Last_Sync__c FROM Resource__c WHERE Employee_ID__c='EXL-019830'];
        Engagement__c engagement=[SELECT Id,Source_Last_Sync__c FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        resource.Source_Last_Sync__c=System.now().addHours(-25);update resource;
        Boolean peopleBlocked=false;try{
            Resource360Service.createStaffingRequest(engagement.Id,resource.Id,'MuleSoft Developer','Billing',nextMonday(Date.today().addDays(1)),nextMonday(Date.today().addDays(1)).addDays(4),2,'TEST-STALE-PEOPLE');
        }catch(AuraHandledException expected){peopleBlocked=true;}System.assert(peopleBlocked,'Staffing must fail closed when People Master exceeds the configured threshold.');
        resource.Source_Last_Sync__c=System.now();update resource;
        engagement.Source_Last_Sync__c=System.now().addHours(-5);update engagement;
        Boolean engagementBlocked=false;try{
            Resource360Service.createStaffingRequest(engagement.Id,resource.Id,'MuleSoft Developer','Billing',nextMonday(Date.today().addDays(1)),nextMonday(Date.today().addDays(1)).addDays(4),2,'TEST-STALE-ENGAGEMENT');
        }catch(AuraHandledException expected){engagementBlocked=true;}System.assert(engagementBlocked,'Staffing must fail closed when Engagement Master exceeds the configured threshold.');

        Commercial_Reference__c commercial=[SELECT Id,Source_Last_Sync__c FROM Commercial_Reference__c WHERE Engagement__c=:engagement.Id LIMIT 1];
        commercial.Source_Last_Sync__c=System.now().addHours(-25);update commercial;
        Budget__c source=[SELECT Id FROM Budget__c WHERE Idempotency_Key__c='DEMO-BUDGET-1001'];
        Id draftId=Resource360Service.createBudgetVersion(source.Id).recordId;
        Boolean commercialBlocked=false;try{Resource360Service.submitBudget(draftId);}catch(AuraHandledException expected){commercialBlocked=true;}System.assert(commercialBlocked,'Budget submission must fail closed when Commercial Master exceeds the configured threshold.');
        Map<String,Object> thresholds=Resource360FreshnessService.configuredThresholds();System.assertEquals(24,thresholds.get('peopleBlockHours'));System.assertEquals(168,thresholds.get('learningDisableHours'));
        System.assertEquals('Unavailable',Resource360FreshnessService.status('Test',null,8,24).state);
        System.assertEquals('Fresh',Resource360FreshnessService.status('Test',System.now(),8,24).state);
        System.assertEquals('Stale',Resource360FreshnessService.status('Test',System.now().addHours(-9),8,24).state);
        System.assertEquals('Blocked',Resource360FreshnessService.status('Test',System.now().addHours(-25),8,24).state);
    }

    @IsTest
    static void correctedTimeEnforcesConfigurableDualControl(){
        Profile adminProfile=[SELECT Id FROM Profile WHERE Name='System Administrator'];User firstApprover=testUser(adminProfile.Id,'timeone');User secondApprover=testUser(adminProfile.Id,'timetwo');insert new List<User>{firstApprover,secondApprover};Id adminPermissionSetId=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Administrator'].Id;insert new List<PermissionSetAssignment>{new PermissionSetAssignment(AssigneeId=firstApprover.Id,PermissionSetId=adminPermissionSetId),new PermissionSetAssignment(AssigneeId=secondApprover.Id,PermissionSetId=adminPermissionSetId)};
        Staffing_Request__c pending=[SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c='DEMO-SR-1001'];Id allocationId=Resource360Service.decideStaffingRequest(pending.Id,true,'Capacity revalidated for correction control.','ignored').recordId;Allocation__c allocation=[SELECT Id,Resource__c,Start_Date__c,End_Date__c FROM Allocation__c WHERE Id=:allocationId];Date weekStart=nextMonday(allocation.Start_Date__c);if(weekStart>allocation.End_Date__c)weekStart=mondayFor(allocation.Start_Date__c);Id sheetId=Resource360Service.createTimesheet(allocation.Resource__c,weekStart).recordId;Resource360Service.saveTimeEntry(sheetId,allocation.Id,weekStart,2,null,'Original approved entry.');Resource360Service.submitTimesheet(sheetId);Resource360Service.decideTimesheet(sheetId,true,'Original manager approval.');Id correctionId=Resource360Service.createTimeCorrection(sheetId,'Move approved time to the correct project context.').recordId;Resource360Service.submitTimesheet(correctionId);
        Timesheet__c submitted=[SELECT Status__c,Dual_Control_Required__c,Approval_Step__c,Required_Approval_Role__c,Correction_Requested_By__c FROM Timesheet__c WHERE Id=:correctionId];System.assert(submitted.Dual_Control_Required__c);System.assertEquals(1,submitted.Approval_Step__c);System.assertEquals('Reporting Manager',submitted.Required_Approval_Role__c);System.assertEquals(UserInfo.getUserId(),submitted.Correction_Requested_By__c);
        System.runAs(firstApprover){Resource360Service.decideTimesheet(correctionId,true,'Reporting manager correction control passed.');}
        submitted=[SELECT Status__c,Approval_Step__c,Required_Approval_Role__c FROM Timesheet__c WHERE Id=:correctionId];System.assertEquals('Submitted',submitted.Status__c);System.assertEquals(2,submitted.Approval_Step__c);System.assertEquals('Timesheet Approver',submitted.Required_Approval_Role__c);
        System.runAs(secondApprover){Resource360Service.decideTimesheet(correctionId,true,'Independent timesheet control passed.');}
        System.assertEquals('Approved',[SELECT Status__c FROM Timesheet__c WHERE Id=:correctionId].Status__c);System.assertEquals(2,[SELECT COUNT() FROM R360_Approval_Decision__c WHERE Entity_Type__c='Timesheet__c' AND Entity_ID__c=:String.valueOf(correctionId) AND State__c='Approved']);
    }

    @IsTest
    static void monthlyRosterImportAndBudgetAssuranceAreDeterministic(){
        Budget__c approved=[SELECT Id,Engagement__c FROM Budget__c WHERE Idempotency_Key__c='DEMO-BUDGET-1001'];Id draftId=Resource360Service.createBudgetVersion(approved.Id).recordId;Engagement__c engagement=[SELECT Start_Date__c,End_Date__c FROM Engagement__c WHERE Id=:approved.Engagement__c];Date period=Date.newInstance(engagement.Start_Date__c.year(),engagement.Start_Date__c.month(),1);List<Object>validRows=new List<Object>{new Map<String,Object>{'periodStart'=>String.valueOf(period),'phase'=>'Deliver','workUnit'=>'Integration','role'=>'Salesforce Architect','location'=>'India','plannedHours'=>80,'costRate'=>2500,'allocationPercent'=>50,'onsite'=>false,'roleStart'=>String.valueOf(engagement.Start_Date__c),'roleEnd'=>String.valueOf(engagement.End_Date__c)}};Resource360BudgetImportService.Preview checked=Resource360BudgetImportService.preview(draftId,JSON.serialize(validRows));System.assert(checked.valid);System.assertEquals('',checked.errorCsv);Resource360Service.ServiceResult committed=Resource360BudgetImportService.commitRoster(draftId,JSON.serialize(validRows),'mock-roster.json');System.assert(committed.success);System.assert([SELECT COUNT() FROM Budget_Line__c WHERE Budget__c=:draftId AND Role_Start__c=:engagement.Start_Date__c AND Role_End__c=:engagement.End_Date__c]>0);Map<String,Object>assurance=(Map<String,Object>)JSON.deserializeUntyped(Resource360AssuranceService.budgetAssurance(draftId,Date.today()));System.assertEquals(true,assurance.get('mock'));System.assertNotEquals(null,assurance.get('monthlyGrid'));
        List<Object>invalidRows=new List<Object>{new Map<String,Object>{'periodStart'=>'not-a-date','phase'=>'Unknown','workUnit'=>'Integration','role'=>'Salesforce Architect','location'=>'India','plannedHours'=>-1,'costRate'=>-1,'allocationPercent'=>101}};Resource360BudgetImportService.Preview rejected=Resource360BudgetImportService.preview(draftId,JSON.serialize(invalidRows));System.assertEquals(false,rejected.valid);System.assert(rejected.errorCsv.contains('INVALID'));
    }

    @IsTest
    static void mockAssuranceCoversImpactScenarioAlertsSessionsAndRetention(){
        Engagement__c engagement=[SELECT Id,Start_Date__c FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];Map<String,Object>impact=(Map<String,Object>)JSON.deserializeUntyped(Resource360AssuranceService.projectImpact(engagement.Id,engagement.Start_Date__c,'Capacity reduction',-2,2500));System.assertEquals(true,impact.get('mock'));Map<String,Object>scenario=(Map<String,Object>)JSON.deserializeUntyped(Resource360AssuranceService.whatIf(JSON.serialize(new Map<String,Object>{'name'=>'Backfill test','startDate'=>String.valueOf(Date.today()),'endDate'=>String.valueOf(Date.today().addDays(30)),'headcountDelta'=>3,'billableAllocationPercent'=>80})));System.assertEquals(true,scenario.get('mock'));System.assert(Decimal.valueOf(String.valueOf(scenario.get('incrementalCapacityHours')))>0);
        R360_Notification__c alert=new R360_Notification__c(Event_ID__c='TEST-ALERT-'+DateTime.now().getTime(),Recipient__c=UserInfo.getUserId(),Title__c='Mock source completeness exception',Message__c='Sanitized trigger evidence.',Severity__c='High',State__c='Delivered',Read__c=false,Occurred_At__c=System.now());insert alert;Resource360Service.ServiceResult closed=Resource360AssuranceService.closeAlert(alert.Id,'Mock owner reconciled the source totals.');System.assert(closed.success);alert=[SELECT Resolution_Status__c,Closed_At__c,Closure_Note__c FROM R360_Notification__c WHERE Id=:alert.Id];System.assertEquals('Closed',alert.Resolution_Status__c);System.assertNotEquals(null,alert.Closed_At__c);
        System.assert(Resource360AssuranceService.startMockSession('Apex test · no device identifiers').success);Map<String,Object>snapshot=(Map<String,Object>)JSON.deserializeUntyped(Resource360AssuranceService.mockAssuranceSnapshot());System.assertEquals('R360-MOCK-1.2',snapshot.get('contractVersion'));System.assertEquals(13,((List<Object>)snapshot.get('sourceContracts')).size());System.assertEquals(18,((List<Object>)snapshot.get('personas')).size());System.assertEquals(7,[SELECT COUNT() FROM R360_Integration_Run__c WHERE Run_ID__c LIKE 'DEMO-SOURCE-%' AND Contract_Version__c='R360-MOCK-1.2' AND Freshness_State__c='Fresh']);Map<String,Object>retention=(Map<String,Object>)JSON.deserializeUntyped(Resource360AssuranceService.retentionPreview());System.assertEquals(false,retention.get('deletionAllowed'));System.assertEquals('Approved mock assumption',retention.get('approvalStatus'));System.assertEquals(8,((List<Object>)retention.get('rules')).size());System.assert(Resource360AssuranceService.runMockRetention('Validate retention candidates without deletion.').success);System.assert([SELECT COUNT() FROM R360_Integration_Run__c WHERE Entity_Type__c='Retention' AND Commit_Mode__c='Dry Run']>0);
    }

    private static Resource360InboundApi.ApiResponse ingest(String runId,String entityType,List<Object> records){
        RestRequest request=new RestRequest();request.requestUri='/services/apexrest/resource360/v1/master-data/'+entityType.toLowerCase();request.httpMethod='POST';request.requestBody=Blob.valueOf(JSON.serialize(new Map<String,Object>{'runId'=>runId,'sourceSystem'=>'EXL Assumed Source','entityType'=>entityType,'contractVersion'=>'R360-MOCK-1.2','records'=>records}));RestContext.request=request;RestContext.response=new RestResponse();return Resource360InboundApi.ingest();
    }

    private static User testUser(Id profileId,String token){
        String unique=token+String.valueOf(DateTime.now().getTime());
        return new User(
            Alias=token.length()>8?token.substring(0,8):token,
            Email=unique+'@example.invalid',EmailEncodingKey='UTF-8',LastName='Resource360 '+token,
            LanguageLocaleKey='en_US',LocaleSidKey='en_IN',ProfileId=profileId,
            TimeZoneSidKey='Asia/Kolkata',Username=unique+'@resource360.example.invalid'
        );
    }

    private static Date nextMonday(Date value){Date monday=mondayFor(value);return monday<value?monday.addDays(7):monday;}
    private static Date mondayFor(Date value){Integer days=Date.newInstance(1900,1,1).daysBetween(value);return value.addDays(-Math.mod(days,7));}
}
