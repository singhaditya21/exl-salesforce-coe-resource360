/** Deterministic, fictional scenario coverage for every Salesforce demo queue. */
public without sharing class Resource360DemoScenarioData {
    @AuraEnabled
    public static Resource360Service.ServiceResult ensure() {
        Date today = Date.today();
        R360_Work_Calendar__c calendar = [SELECT Id FROM R360_Work_Calendar__c WHERE Calendar_ID__c='CAL-IN-STD' LIMIT 1];
        R360_Org_Unit__c orgUnit = [SELECT Id FROM R360_Org_Unit__c WHERE Org_Unit_ID__c='ORG-SFCOE' LIMIT 1];
        R360_Portfolio__c portfolio = [SELECT Id, Account__c FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' LIMIT 1];
        Engagement__c retail = [SELECT Id, Account__c, Start_Date__c, End_Date__c FROM Engagement__c WHERE Engagement_ID__c='ENG-1001' LIMIT 1];
        Budget__c approvedBudget = [
            SELECT Id, Economic_Signature__c FROM Budget__c
            WHERE Engagement__c=:retail.Id AND State__c='Approved' AND Current__c=true LIMIT 1
        ];

        Map<String, User> demoUsers = new Map<String, User>();
        for (User demoUser : [SELECT Id, FederationIdentifier FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%' AND IsActive=true]) {
            demoUsers.put(demoUser.FederationIdentifier, demoUser);
        }
        Id projectUserId = userId(demoUsers, 'R360-DEMO-PROJECT');
        Id stafferUserId = userId(demoUsers, 'R360-DEMO-STAFFER');
        Id managerUserId = userId(demoUsers, 'R360-DEMO-MANAGER');
        Id makerUserId = userId(demoUsers, 'R360-DEMO-CONFIGMAKER');
        Id checkerUserId = userId(demoUsers, 'R360-DEMO-CHECKER');
        Id approverUserId = userId(demoUsers, 'R360-DEMO-APPROVER');

        Map<String, Resource__c> resources = ensureResources(today, calendar.Id, orgUnit.Id, managerUserId);
        ensureEngagements(today, portfolio, projectUserId);
        Map<String, Staffing_Request__c> requests = ensureStaffing(today, retail.Id, approvedBudget.Economic_Signature__c, resources, projectUserId, stafferUserId);
        Map<String, Allocation__c> allocations = ensureAllocations(today, retail.Id, requests, stafferUserId);
        ensureTimesheets(today, resources, allocations, managerUserId, approverUserId);
        ensureLearning(today, resources);
        ensureCalendar(today, calendar.Id);
        ensureConfigurations(today, makerUserId, checkerUserId);
        ensureIntegrationExceptions();
        ensureNotifications(stafferUserId, managerUserId, projectUserId, approverUserId);
        ensureAudit();
        return new Resource360Service.ServiceResult(true, 'Deterministic Salesforce demo queues and exception states are ready.', retail.Id, 'R360-DEMO-SCENARIOS-V1');
    }

    private static Map<String, Resource__c> ensureResources(Date today, Id calendarId, Id orgUnitId, Id managerUserId) {
        List<List<String>> definitions = new List<List<String>>{
            new List<String>{'DEMO-EXL-001','Meera Iyer','Data & AI','Data Cloud Consultant','Bengaluru','65'},
            new List<String>{'DEMO-EXL-002','Vihaan Shah','Integration','MuleSoft Architect','Hyderabad','30'},
            new List<String>{'DEMO-EXL-003','Ananya Bose','Service','Service Cloud Consultant','Pune','80'},
            new List<String>{'DEMO-EXL-004','Arjun Nair','Data & AI','CRM Analytics Lead','Bengaluru','45'},
            new List<String>{'DEMO-EXL-005','Ishita Verma','Service','Salesforce Developer','Noida','100'},
            new List<String>{'DEMO-EXL-006','Dev Malhotra','Integration','Integration Developer','Gurugram','55'},
            new List<String>{'DEMO-EXL-007','Sara Khan','Data & AI','AI Cloud Consultant','Pune','90'},
            new List<String>{'DEMO-EXL-008','Neel Joshi','Service','Experience Cloud Lead','Bengaluru','20'},
            new List<String>{'DEMO-EXL-009','Tara Menon','Integration','Quality Engineer','Hyderabad','75'}
        };
        List<Resource__c> records = new List<Resource__c>();
        for (List<String> definition : definitions) {
            records.add(new Resource__c(
                Employee_ID__c=definition[0], Preferred_Name__c=definition[1],
                Work_Email__c=definition[0].toLowerCase()+'@example.invalid', Status__c='Active',
                Employment_Start__c=today.addYears(-2), Grade__c='C2', Tower__c=definition[2],
                Primary_Role__c=definition[3], Location__c=definition[4], Time_Zone__c='Asia/Kolkata',
                Org_Unit_ID__c='ORG-SFCOE', Org_Unit__c=orgUnitId, Work_Calendar__c=calendarId,
                Daily_Capacity_Hours__c=8, Available_Percent__c=Decimal.valueOf(definition[5]),
                Source_Last_Sync__c=System.now()
            ));
        }
        upsert records Employee_ID__c;
        Resource__c baseManager = [SELECT Id FROM Resource__c WHERE Employee_ID__c='EXL-018462' LIMIT 1];
        for (Resource__c record : records) record.Manager__c = baseManager.Id;
        update records;
        Map<String, Resource__c> result = new Map<String, Resource__c>();
        for (Resource__c record : [SELECT Id, Employee_ID__c FROM Resource__c WHERE Employee_ID__c LIKE 'DEMO-EXL-%']) result.put(record.Employee_ID__c, record);
        return result;
    }

    private static void ensureEngagements(Date today, R360_Portfolio__c portfolio, Id projectUserId) {
        Map<String,Engagement__c> existingByCode = new Map<String,Engagement__c>();
        for (Engagement__c existing : [
            SELECT Id,Engagement_ID__c,Account__c,Portfolio_ID__c,Portfolio__c,Sub_Portfolio__c
            FROM Engagement__c WHERE Engagement_ID__c IN ('DEMO-ENG-1003','DEMO-ENG-1004')
        ]) existingByCode.put(existing.Engagement_ID__c, existing);
        List<Engagement__c> records = new List<Engagement__c>{
            new Engagement__c(
                Name='Consumer Loyalty Transformation', Engagement_ID__c='DEMO-ENG-1003', Account__c=portfolio.Account__c,
                Portfolio_ID__c='PORT-SFCOE-DEMO', Portfolio__c=portfolio.Id, Project_Manager__c=projectUserId,
                Start_Date__c=today.addMonths(-3), End_Date__c=today.addMonths(9), Status__c='Active',
                Lifecycle_Stage__c='Delivery', Completion_Percent__c=25,
                Revenue_Type__c='Time and Materials', Currency_Code__c='INR', PO_Value__c=52000000,
                Salesforce_Tower__c='Experience Cloud', Industry__c='Consumer', Confidentiality__c='EXL Internal', Source_Last_Sync__c=System.now()
            ),
            new Engagement__c(
                Name='Banking Service Modernization', Engagement_ID__c='DEMO-ENG-1004', Account__c=portfolio.Account__c,
                Portfolio_ID__c='PORT-SFCOE-DEMO', Portfolio__c=portfolio.Id, Project_Manager__c=projectUserId,
                Start_Date__c=today.addMonths(-1), End_Date__c=today.addMonths(11), Status__c='Active',
                Lifecycle_Stage__c='Delivery', Completion_Percent__c=15,
                Revenue_Type__c='Fixed Price', Currency_Code__c='INR', PO_Value__c=61000000,
                Salesforce_Tower__c='Service Cloud', Industry__c='Banking', Confidentiality__c='EXL Internal', Source_Last_Sync__c=System.now()
            )
        };
        for (Engagement__c record : records) {
            Engagement__c existing = existingByCode.get(record.Engagement_ID__c);
            if (existing == null) continue;
            record.Id = existing.Id;
            record.Account__c = existing.Account__c;
            record.Portfolio_ID__c = existing.Portfolio_ID__c;
            record.Portfolio__c = existing.Portfolio__c;
            record.Sub_Portfolio__c = existing.Sub_Portfolio__c;
        }
        upsert records Engagement_ID__c;
    }

    private static Map<String, Staffing_Request__c> ensureStaffing(
        Date today, Id engagementId, String budgetSignature, Map<String, Resource__c> resources, Id requesterId, Id stafferId
    ) {
        List<Staffing_Request__c> records = new List<Staffing_Request__c>{
            request('DEMO-SR-QUEUE-PENDING', engagementId, resources.get('DEMO-EXL-001').Id, 'Data Cloud Consultant', 'Billing', today.addDays(7), today.addDays(70), 4, 'High', 'Pending', requesterId, stafferId, budgetSignature, 'High-fit candidate awaiting COE Staffer decision.'),
            request('DEMO-SR-QUEUE-DRAFT', engagementId, resources.get('DEMO-EXL-002').Id, 'MuleSoft Architect', 'Billing', today.addDays(14), today.addDays(100), 3, 'Normal', 'Draft', requesterId, stafferId, budgetSignature, 'Demand draft awaiting project-manager submission.'),
            request('DEMO-SR-QUEUE-DECLINED', engagementId, resources.get('DEMO-EXL-003').Id, 'Service Cloud Consultant', 'Billing', today.addDays(5), today.addDays(60), 4, 'High', 'Declined', requesterId, stafferId, budgetSignature, 'Declined after an overlapping critical assignment was confirmed.'),
            request('DEMO-SR-QUEUE-WITHDRAWN', engagementId, resources.get('DEMO-EXL-004').Id, 'CRM Analytics Lead', 'Billing', today.addDays(12), today.addDays(90), 2, 'Normal', 'Withdrawn', requesterId, stafferId, budgetSignature, 'Withdrawn after the delivery plan was re-sequenced.'),
            request('DEMO-SR-ALLOC-WAR', engagementId, resources.get('DEMO-EXL-005').Id, 'Salesforce Developer', 'WAR', today.addDays(-35), today.addDays(90), 4, 'High', 'Accepted', requesterId, stafferId, budgetSignature, 'WAR allocation awaiting commercial conversion.'),
            request('DEMO-SR-ALLOC-IFB', engagementId, resources.get('DEMO-EXL-006').Id, 'Integration Developer', 'IFB/PO Awaited', today.addDays(-18), today.addDays(90), 3, 'High', 'Accepted', requesterId, stafferId, budgetSignature, 'Purchase-order evidence remains pending.'),
            request('DEMO-SR-ALLOC-TRAINING', engagementId, resources.get('DEMO-EXL-007').Id, 'AI Cloud Consultant', 'Training', today.addDays(-10), today.addDays(40), 2, 'Normal', 'Accepted', requesterId, stafferId, budgetSignature, 'Structured Agentforce enablement investment.'),
            request('DEMO-SR-ALLOC-BILLING', engagementId, resources.get('DEMO-EXL-008').Id, 'Experience Cloud Lead', 'Billing', today.addDays(-25), today.addDays(120), 5, 'Normal', 'Accepted', requesterId, stafferId, budgetSignature, 'Confirmed billable delivery allocation.')
        };
        upsert records Idempotency_Key__c;
        Map<String, Staffing_Request__c> result = new Map<String, Staffing_Request__c>();
        for (Staffing_Request__c record : [SELECT Id, Idempotency_Key__c, Resource__c, Requested_Role__c, Classification__c, Start_Date__c, End_Date__c, Daily_Hours__c FROM Staffing_Request__c WHERE Idempotency_Key__c LIKE 'DEMO-SR-%']) result.put(record.Idempotency_Key__c, record);
        return result;
    }

    private static Staffing_Request__c request(
        String key, Id engagementId, Id resourceId, String role, String classification, Date startDate, Date endDate,
        Decimal hours, String priority, String state, Id requesterId, Id stafferId, String signature, String summary
    ) {
        Boolean decided = new Set<String>{'Accepted','Declined','Withdrawn','Expired'}.contains(state);
        Boolean unbilled = classification != 'Billing';
        return new Staffing_Request__c(
            Idempotency_Key__c=key, Engagement__c=engagementId, Resource__c=resourceId, Requested_Role__c=role,
            Classification__c=classification, Start_Date__c=startDate, End_Date__c=endDate, Daily_Hours__c=hours,
            Priority__c=priority, State__c=state, Requester__c=requesterId, SLA_Due__c=state=='Pending'?System.now().addHours(12):System.now().addDays(-2),
            Fit_Score__c=state=='Pending'?92:78, Requirement_Summary__c=summary, Request_Version__c=1,
            Budget_Signature__c=signature, Request_Fingerprint__c=fingerprint(key), Responsible_Owner__c=unbilled?stafferId:null,
            Review_Date__c=unbilled?Date.today().addDays(7):null, Control_Reason__c=unbilled?summary:null,
            Decision_By__c=decided?stafferId:null, Decision_Role__c=decided?'COE Staffer':null,
            Decision_At__c=decided?System.now().addDays(-1):null, Decision_Reason__c=decided?summary:null,
            Decision_Correlation_ID__c=decided?'DEMO-'+key:null
        );
    }

    private static Map<String, Allocation__c> ensureAllocations(Date today, Id engagementId, Map<String, Staffing_Request__c> requests, Id stafferId) {
        List<String> keys = new List<String>{'DEMO-SR-ALLOC-WAR','DEMO-SR-ALLOC-IFB','DEMO-SR-ALLOC-TRAINING','DEMO-SR-ALLOC-BILLING'};
        Set<Id> requestIds = new Set<Id>();
        for (String key : keys) requestIds.add(requests.get(key).Id);
        Map<Id, Allocation__c> existingByRequest = new Map<Id, Allocation__c>();
        for (Allocation__c allocation : [SELECT Id, Originating_Request__c FROM Allocation__c WHERE Originating_Request__c IN :requestIds AND Current__c=true]) existingByRequest.put(allocation.Originating_Request__c, allocation);
        List<Allocation__c> changes = new List<Allocation__c>();
        for (String key : keys) {
            Staffing_Request__c source = requests.get(key);
            Allocation__c allocation = existingByRequest.get(source.Id);
            if (allocation == null) allocation = new Allocation__c(Originating_Request__c=source.Id);
            allocation.Resource__c=source.Resource__c; allocation.Engagement__c=engagementId; allocation.Role__c=source.Requested_Role__c;
            allocation.Classification__c=source.Classification__c; allocation.Billable_Snapshot__c=source.Classification__c=='Billing';
            allocation.Start_Date__c=source.Start_Date__c; allocation.End_Date__c=source.End_Date__c; allocation.Daily_Hours__c=source.Daily_Hours__c;
            allocation.State__c='Accepted'; allocation.Version__c=1; allocation.Current__c=true;Resource360CapacityService.stampSeededPublished(allocation,'Deterministic scenario allocation.');
            if (source.Classification__c!='Billing') {
                allocation.Responsible_Owner__c=stafferId; allocation.Review_Date__c=today.addDays(7);
                allocation.Control_Reason__c=source.Classification__c+' demo control with accountable review.';
            }
            changes.add(allocation);
        }
        upsert changes;
        Map<String, Allocation__c> result = new Map<String, Allocation__c>();
        for (Allocation__c allocation : [SELECT Id, Originating_Request__r.Idempotency_Key__c, Resource__c, Engagement__c, Role__c FROM Allocation__c WHERE Originating_Request__c IN :requestIds AND Current__c=true]) result.put(allocation.Originating_Request__r.Idempotency_Key__c, allocation);
        return result;
    }

    private static void ensureTimesheets(Date today, Map<String, Resource__c> resources, Map<String, Allocation__c> allocations, Id managerId, Id approverId) {
        Date week = monday(today.addDays(-7));
        List<Timesheet__c> records = new List<Timesheet__c>{
            timesheet('DEMO-TS-DRAFT-V1', resources.get('DEMO-EXL-005').Id, week, 'Draft', null, null),
            timesheet('DEMO-TS-APPROVED-V1', resources.get('DEMO-EXL-006').Id, week, 'Approved', managerId, 'Approved after allocation and daily-capacity checks.'),
            timesheet('DEMO-TS-REJECTED-V1', resources.get('DEMO-EXL-007').Id, week, 'Rejected', managerId, 'Rejected because the work-unit evidence was incomplete.'),
            timesheet('DEMO-TS-CORRECTION-V1', resources.get('DEMO-EXL-008').Id, week, 'Correction Pending', approverId, 'Controlled correction requires independent final approval.'),
            timesheet('DEMO-TS-SUBMITTED-V1', resources.get('DEMO-EXL-001').Id, week, 'Submitted', null, null)
        };
        upsert records Week_Key__c;
        Map<String, Timesheet__c> sheets = new Map<String, Timesheet__c>();
        for (Timesheet__c sheet : [SELECT Id, Week_Key__c, Week_Start__c, Status__c FROM Timesheet__c WHERE Week_Key__c LIKE 'DEMO-TS-%']) sheets.put(sheet.Week_Key__c, sheet);
        Map<String, Allocation__c> allocationBySheet = new Map<String, Allocation__c>{
            'DEMO-TS-DRAFT-V1'=>allocations.get('DEMO-SR-ALLOC-WAR'),
            'DEMO-TS-APPROVED-V1'=>allocations.get('DEMO-SR-ALLOC-IFB'),
            'DEMO-TS-REJECTED-V1'=>allocations.get('DEMO-SR-ALLOC-TRAINING'),
            'DEMO-TS-CORRECTION-V1'=>allocations.get('DEMO-SR-ALLOC-BILLING'),
            'DEMO-TS-SUBMITTED-V1'=>allocations.get('DEMO-SR-ALLOC-WAR')
        };
        Set<String> entryKeys = new Set<String>();
        for (Time_Entry__c entry : [SELECT Entry_Key__c FROM Time_Entry__c WHERE Entry_Key__c LIKE 'DEMO-TE-%']) entryKeys.add(entry.Entry_Key__c);
        List<Time_Entry__c> entries = new List<Time_Entry__c>();
        for (String sheetKey : sheets.keySet()) {
            String entryKey='DEMO-TE-'+sheetKey.replace('DEMO-TS-','');
            if (entryKeys.contains(entryKey)) continue;
            Timesheet__c sheet=sheets.get(sheetKey); Allocation__c allocation=allocationBySheet.get(sheetKey);
            String entryState=sheet.Status__c=='Approved'?'Approved':sheet.Status__c=='Rejected'?'Rejected':sheet.Status__c=='Draft'?'Draft':'Submitted';
            entries.add(new Time_Entry__c(Timesheet__c=sheet.Id,Allocation__c=allocation.Id,Engagement__c=allocation.Engagement__c,Work_Date__c=sheet.Week_Start__c,Hours__c=allocation.Role__c.contains('Lead')?5:3,Role__c=allocation.Role__c,State__c=entryState,Comment__c='Deterministic sanitized '+sheet.Status__c.toLowerCase()+' time-entry example.',Entry_Key__c=entryKey,Version__c=1));
        }
        if (!entries.isEmpty()) insert entries;
    }

    private static Timesheet__c timesheet(String key, Id resourceId, Date week, String status, Id approverId, String note) {
        Boolean submitted=status!='Draft'; Boolean decided=new Set<String>{'Approved','Rejected'}.contains(status);
        return new Timesheet__c(
            Resource__c=resourceId,Week_Start__c=week,Week_Key__c=key,Status__c=status,
            Submitted_At__c=submitted?System.now().addDays(-3):null,Due_At__c=DateTime.newInstance(week.addDays(8),Time.newInstance(18,0,0,0)),
            Decision_Due_At__c=submitted?System.now().addDays(2):null,Version__c=1,Current__c=true,Auto_Approved__c=false,
            Approver__c=decided?approverId:null,Decision_At__c=decided?System.now().addDays(-1):null,Decision_Note__c=note,
            Dual_Control_Required__c=status=='Correction Pending',Approval_Step__c=status=='Correction Pending'?2:0,
            Required_Approval_Role__c=status=='Correction Pending'?'Timesheet Approver':null,Exception_Code__c=status=='Correction Pending'?'DEMO-CORRECTION':null
        );
    }

    private static void ensureLearning(Date today, Map<String, Resource__c> resources) {
        Capability__c dataCloud=[SELECT Id FROM Capability__c WHERE Capability_ID__c='CAP-DATA-CLOUD' LIMIT 1];
        Capability__c mulesoft=[SELECT Id FROM Capability__c WHERE Capability_ID__c='CAP-MULE-API' LIMIT 1];
        List<R360_Learning_Achievement__c> records=new List<R360_Learning_Achievement__c>{
            achievement('DEMO-LRN-001',resources.get('DEMO-EXL-001').Id,dataCloud.Id,'Data Cloud Foundations','Trailhead',today.addDays(-40),'Completed'),
            achievement('DEMO-LRN-002',resources.get('DEMO-EXL-002').Id,mulesoft.Id,'API-led Connectivity Workshop','EXL Learning',today.addDays(-25),'Completed'),
            achievement('DEMO-LRN-003',resources.get('DEMO-EXL-007').Id,dataCloud.Id,'Agentforce Builder Lab','Salesforce',today.addDays(-12),'Completed'),
            achievement('DEMO-LRN-004',resources.get('DEMO-EXL-009').Id,mulesoft.Id,'Integration Testing Academy','EXL Learning',today.addDays(-7),'Completed')
        };
        upsert records Achievement_ID__c;
    }

    private static R360_Learning_Achievement__c achievement(String key,Id resourceId,Id capabilityId,String course,String provider,Date completed,String state){return new R360_Learning_Achievement__c(Achievement_ID__c=key,Resource__c=resourceId,Capability__c=capabilityId,Course_Name__c=course,Provider__c=provider,Completed_On__c=completed,State__c=state,Source_Last_Sync__c=System.now());}

    private static void ensureCalendar(Date today, Id calendarId) {
        List<R360_Calendar_Exception__c> records=new List<R360_Calendar_Exception__c>{
            new R360_Calendar_Exception__c(Exception_Key__c='DEMO-CAL-HOLIDAY',Calendar__c=calendarId,Exception_Date__c=today.addDays(15),Capacity_Hours__c=0,Reason__c='Fictional regional holiday for deadline calculations.'),
            new R360_Calendar_Exception__c(Exception_Key__c='DEMO-CAL-EARLY-CLOSE',Calendar__c=calendarId,Exception_Date__c=today.addDays(30),Capacity_Hours__c=4,Reason__c='Fictional early-closure capacity exception.'),
            new R360_Calendar_Exception__c(Exception_Key__c='DEMO-CAL-SPECIAL-WORK',Calendar__c=calendarId,Exception_Date__c=today.addDays(40),Capacity_Hours__c=8,Reason__c='Fictional special working day for a controlled release.')
        };
        upsert records Exception_Key__c;
    }

    private static void ensureConfigurations(Date today, Id makerId, Id checkerId) {
        Set<String> existingKeys=new Set<String>();
        for(R360_Configuration__c record:[SELECT Version_Key__c FROM R360_Configuration__c WHERE Version_Key__c LIKE 'DEMO-CONFIG-%'])existingKeys.add(record.Version_Key__c);
        List<R360_Configuration__c> drafts=new List<R360_Configuration__c>();
        if(!existingKeys.contains('DEMO-CONFIG-DRAFT-V1'))drafts.add(configuration('DEMO-CONFIG-DRAFT-V1','Notification','Demo_Digest_Mode','Demo digest mode','Text',null,'Daily'));
        if(!existingKeys.contains('DEMO-CONFIG-PENDING-V1'))drafts.add(configuration('DEMO-CONFIG-PENDING-V1','Integration','Demo_Retry_Batch','Demo retry batch','Number',25,null));
        if(!existingKeys.contains('DEMO-CONFIG-ACTIVE-V1'))drafts.add(configuration('DEMO-CONFIG-ACTIVE-V1','KPI','Demo_Portfolio_Confidence','Demo portfolio confidence','Number',85,null));
        if(!existingKeys.contains('DEMO-CONFIG-REJECTED-V1'))drafts.add(configuration('DEMO-CONFIG-REJECTED-V1','Policy','Demo_Max_Bench_Days','Demo maximum bench days','Number',45,null));
        if(!drafts.isEmpty())insert drafts;
        List<R360_Configuration__c> pendingTransitions=[SELECT Id,Version_Key__c,State__c FROM R360_Configuration__c WHERE Version_Key__c IN ('DEMO-CONFIG-PENDING-V1','DEMO-CONFIG-ACTIVE-V1','DEMO-CONFIG-REJECTED-V1') AND State__c='Draft'];
        for(R360_Configuration__c record:pendingTransitions){record.State__c='Pending Approval';record.Submitted_By__c=makerId;record.Submitted_At__c=System.now().addDays(-1);record.Validation_Summary__c='Validated deterministic demo configuration.';}if(!pendingTransitions.isEmpty())update pendingTransitions;
        List<R360_Configuration__c> decisions=[SELECT Id,Version_Key__c,State__c FROM R360_Configuration__c WHERE Version_Key__c IN ('DEMO-CONFIG-ACTIVE-V1','DEMO-CONFIG-REJECTED-V1') AND State__c='Pending Approval'];
        for(R360_Configuration__c record:decisions){Boolean shouldActivate=record.Version_Key__c=='DEMO-CONFIG-ACTIVE-V1';record.State__c=shouldActivate?'Active':'Rejected';record.Current__c=shouldActivate;record.Approved_By__c=checkerId;record.Approved_At__c=System.now();}if(!decisions.isEmpty())update decisions;
    }

    private static R360_Configuration__c configuration(String versionKey,String domain,String code,String label,String valueType,Decimal numberValue,String textValue){return new R360_Configuration__c(Configuration_Key__c=domain.toUpperCase()+'.'+code,Domain__c=domain,Code__c=code,Display_Label__c=label,Value_Type__c=valueType,Numeric_Value__c=numberValue,Text_Value__c=textValue,Effective_From__c=Date.today(),Version__c=1,Version_Key__c=versionKey,State__c='Draft',Current__c=false,Change_Reason__c='Deterministic sanitized maker-checker demo state.');}

    private static void ensureIntegrationExceptions() {
        R360_Integration_Run__c run=new R360_Integration_Run__c(Run_ID__c='DEMO-SOURCE-ERRORS',Source_System__c='People Master',Entity_Type__c='Employee',State__c='Partial',Started_At__c=System.now().addMinutes(-20),Completed_At__c=System.now().addMinutes(-18),Source_Cutoff__c=System.now().addMinutes(-25),Processed_Count__c=25,Success_Count__c=22,Failure_Count__c=3,Inserted_Count__c=1,Updated_Count__c=21,Collision_Count__c=1,Completeness_Percent__c=88,Freshness_State__c='Stale',Contract_Version__c='R360-MOCK-1.2',Commit_Mode__c='Partial',Correlation_ID__c='R360-MOCK-ERROR-SCENARIO',Detail__c='Fictional validation failures retained for operator triage.');upsert run Run_ID__c;
        List<R360_Integration_Error__c>existing=[SELECT Id FROM R360_Integration_Error__c WHERE Integration_Run__r.Run_ID__c='DEMO-SOURCE-ERRORS'];if(existing.isEmpty())insert new List<R360_Integration_Error__c>{
            new R360_Integration_Error__c(Integration_Run__c=run.Id,Error_Code__c='REQUIRED_FIELD',Error_Message__c='Preferred name was missing in the fictional source row.',External_Record_ID__c='DEMO-PEOPLE-019',Row_Number__c=19,Payload_Hash__c=fingerprint('DEMO-PEOPLE-019'),Retry_Count__c=0,State__c='Open',Next_Retry_At__c=System.now().addMinutes(30)),
            new R360_Integration_Error__c(Integration_Run__c=run.Id,Error_Code__c='DUPLICATE_KEY',Error_Message__c='Employee identifier collided with another fictional row.',External_Record_ID__c='DEMO-PEOPLE-021',Row_Number__c=21,Payload_Hash__c=fingerprint('DEMO-PEOPLE-021'),Retry_Count__c=1,State__c='Retry Pending',Next_Retry_At__c=System.now().addMinutes(15)),
            new R360_Integration_Error__c(Integration_Run__c=run.Id,Error_Code__c='INVALID_ORG_UNIT',Error_Message__c='The fictional organizational unit was not effective at the source cutoff.',External_Record_ID__c='DEMO-PEOPLE-024',Row_Number__c=24,Payload_Hash__c=fingerprint('DEMO-PEOPLE-024'),Retry_Count__c=3,State__c='Dead Letter')
        };
    }

    private static void ensureNotifications(Id stafferId,Id managerId,Id projectId,Id approverId){List<R360_Notification__c>records=new List<R360_Notification__c>{
        notification('DEMO-NTF-STAFFING',stafferId,'Pending staffing decision','A high-priority Data Cloud request is inside its twelve-hour SLA.','High','Delivered','Open',null),
        notification('DEMO-NTF-TIME',managerId,'Timesheet approval due','A submitted weekly timesheet is ready for manager review.','High','Delivered','Open',null),
        notification('DEMO-NTF-INTEGRATION',stafferId,'Integration exception requires triage','Three fictional People Master rows failed validation.','Critical','Failed','Open',null),
        notification('DEMO-NTF-CLOSED',projectId,'Commercial reference reconciled','The fictional SOW amount was reconciled to the current engagement.','Normal','Delivered','Closed','Validated against the sanitized commercial fixture.'),
        notification('DEMO-NTF-BUDGET',approverId,'Budget decision assigned','A pending budget is routed to the configured approval chain.','High','Delivered','Open',null)
    };upsert records Event_ID__c;}

    private static R360_Notification__c notification(String key,Id recipientId,String title,String message,String severity,String state,String resolution,String closure){Boolean closed=resolution=='Closed';return new R360_Notification__c(Event_ID__c=key,Recipient__c=recipientId,Title__c=title,Message__c=message,Severity__c=severity,State__c=state,Read__c=closed,Occurred_At__c=System.now().addHours(-2),Resolution_Status__c=resolution,Accountable_Owner__c=recipientId,First_Seen_At__c=System.now().addHours(-2),Closed_At__c=closed?System.now().addHours(-1):null,Closed_By__c=closed?recipientId:null,Closure_Note__c=closure,Deep_Link__c='/lightning/n/Resource360_Workspace');}

    private static void ensureAudit(){if([SELECT COUNT() FROM R360_Audit_Event__c WHERE Event_ID__c='DEMO-AUD-SCENARIOS']==0)insert new R360_Audit_Event__c(Event_ID__c='DEMO-AUD-SCENARIOS',Correlation_ID__c='R360-DEMO-SCENARIOS-V1',Actor__c=UserInfo.getUserId(),Active_Role__c='Resource 360 System',Action__c='DEMO_SCENARIOS_READY',Entity_Type__c='Environment',Entity_ID__c='Resource360Hub',Entity_Version__c=1,Detail__c='Deterministic queues, decisions, exceptions, configuration and learning fixtures loaded.',Occurred_At__c=System.now());}
    private static Id userId(Map<String,User>users,String federationId){return users.containsKey(federationId)?users.get(federationId).Id:UserInfo.getUserId();}
    private static Date monday(Date value){Integer days=Date.newInstance(1900,1,1).daysBetween(value);return value.addDays(-Math.mod(days,7));}
    private static String fingerprint(String value){return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value)));}
}
