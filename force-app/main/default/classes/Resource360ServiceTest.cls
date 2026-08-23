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
        System.assertEquals('Ended',[SELECT State__c FROM Allocation__c WHERE Id=:ended.recordId].State__c);
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
                Engagement__c=engagement.Id, Version__c=99, Current__c=false, State__c='Draft', Revenue__c=10000000,
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
        Resource360Service.ServiceResult versioned=Resource360Service.createBudgetVersion(budget.Id);
        System.assertEquals('Draft',[SELECT State__c FROM Budget__c WHERE Id=:versioned.recordId].State__c);
        System.assertEquals(1,[SELECT COUNT() FROM Budget_Line__c WHERE Budget__c=:versioned.recordId]);
        Budget__c approvedDemo=[SELECT Id FROM Budget__c WHERE Idempotency_Key__c='DEMO-BUDGET-1001'];
        Budget_Line__c approvedLine=[SELECT Id,Cost_Rate__c FROM Budget_Line__c WHERE Budget__c=:approvedDemo.Id LIMIT 1];
        approvedLine.Cost_Rate__c+=1;update approvedLine;
        System.assertEquals('Invalidated',[SELECT State__c FROM Budget__c WHERE Id=:approvedDemo.Id].State__c);
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
            'runId'=>'TEST-INBOUND-001', 'sourceSystem'=>'EXL HRMS', 'entityType'=>'Employee',
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

        Test.startTest();
        new Resource360OperationsScheduler().execute(null);
        Test.stopTest();
        System.assertEquals('Expired',[SELECT State__c FROM Staffing_Request__c WHERE Id=:pending.Id].State__c);
        System.assertEquals('Expired',[SELECT State__c FROM Credential__c WHERE Credential_ID__c='TEST-EXPIRED-001'].State__c);
        System.assert([SELECT COUNT() FROM R360_Integration_Run__c WHERE Entity_Type__c='Operational Controls' AND State__c='Succeeded']>0);

        Capability__c capability=[SELECT Id FROM Capability__c WHERE Capability_ID__c='CAP-DATA-CLOUD'];
        List<Resource360TalentService.Candidate> candidates=Resource360TalentService.searchCandidates(capability.Id,4,'Data Cloud Architect',Date.today(),Date.today().addDays(5),2,'Data & AI','Bengaluru',10);
        System.assert(!candidates.isEmpty());System.assert(candidates[0].explanation.contains('fit policy v1'));
        String criteria=JSON.serialize(new Map<String,Object>{'mode'=>'rank','startDate'=>Date.today(),'endDate'=>Date.today().addDays(5),'dailyHours'=>2,'requestedRole'=>'Data Cloud Architect','industry'=>'Retail','minimumExperience'=>3,'preferredCredentials'=>new List<String>{'Data Cloud'},'capabilityRequirements'=>new List<Object>{new Map<String,Object>{'capabilityId'=>capability.Id,'minimumLevel'=>4,'mandatory'=>true}}});
        List<Resource360TalentService.Candidate>ranked=Resource360TalentService.searchCandidatesV2(criteria);System.assert(!ranked.isEmpty());System.assert(ranked[0].score>0);System.assert(ranked[0].eligible);
        String workspace=Resource360Service.getWorkspaceData();
        System.assert(workspace.contains('activeRoles'));System.assert(workspace.contains('integrationRuns'));System.assert(workspace.contains('utilizationPercent'));
        Resource360ScopeSharingService.rebuildUser(UserInfo.getUserId());
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
    }

    private static Resource360InboundApi.ApiResponse ingest(String runId,String entityType,List<Object> records){
        RestRequest request=new RestRequest();request.requestUri='/services/apexrest/resource360/v1/master-data/'+entityType.toLowerCase();request.httpMethod='POST';request.requestBody=Blob.valueOf(JSON.serialize(new Map<String,Object>{'runId'=>runId,'sourceSystem'=>'EXL Assumed Source','entityType'=>entityType,'records'=>records}));RestContext.request=request;RestContext.response=new RestResponse();return Resource360InboundApi.ingest();
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
