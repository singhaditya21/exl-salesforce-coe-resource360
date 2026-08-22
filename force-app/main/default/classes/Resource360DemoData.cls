public with sharing class Resource360DemoData {
    @AuraEnabled
    public static Resource360Service.ServiceResult seed() {
        String runKey = 'R360-DEMO-V1';
        List<Resource__c> existing = [SELECT Id FROM Resource__c WHERE Employee_ID__c = 'EXL-018462' LIMIT 1];
        if (!existing.isEmpty()) {
            return new Resource360Service.ServiceResult(true, 'Sanitized demo data is already loaded.', existing[0].Id, runKey);
        }

        Date today = Date.today();
        Resource__c aarav = new Resource__c(Employee_ID__c='EXL-018462', Preferred_Name__c='Aarav Mehta', Work_Email__c='aarav.mehta@example.invalid', Status__c='Active', Employment_Start__c=today.addYears(-5), Grade__c='M2', Tower__c='Data & AI', Primary_Role__c='Data Cloud Architect', Location__c='Bengaluru', Time_Zone__c='Asia/Kolkata', Daily_Capacity_Hours__c=8, Available_Percent__c=40, Source_Last_Sync__c=System.now());
        Resource__c riya = new Resource__c(Employee_ID__c='EXL-017091', Preferred_Name__c='Riya Sen', Work_Email__c='riya.sen@example.invalid', Status__c='Active', Employment_Start__c=today.addYears(-6), Grade__c='M1', Tower__c='Service', Primary_Role__c='Service Cloud Lead', Location__c='Pune', Time_Zone__c='Asia/Kolkata', Daily_Capacity_Hours__c=8, Available_Percent__c=50, Source_Last_Sync__c=System.now());
        Resource__c kabir = new Resource__c(Employee_ID__c='EXL-019830', Preferred_Name__c='Kabir Rao', Work_Email__c='kabir.rao@example.invalid', Status__c='Active', Employment_Start__c=today.addYears(-3), Grade__c='C2', Tower__c='Integration', Primary_Role__c='MuleSoft Developer', Location__c='Hyderabad', Time_Zone__c='Asia/Kolkata', Daily_Capacity_Hours__c=8, Available_Percent__c=100, Source_Last_Sync__c=System.now());
        insert new List<Resource__c>{aarav, riya, kabir};

        Account account = new Account(Name='Global Retail Demo');
        insert account;
        Engagement__c retail = new Engagement__c(Name='Global Retail Cloud', Engagement_ID__c='ENG-1001', Account__c=account.Id, Project_Manager__c=UserInfo.getUserId(), Start_Date__c=today.addMonths(-2), End_Date__c=today.addMonths(10), Status__c='Active', Revenue_Type__c='Time and Materials', Currency_Code__c='INR', PO_Value__c=84000000, Salesforce_Tower__c='Data Cloud', Industry__c='Retail', Confidentiality__c='EXL Internal', Source_Last_Sync__c=System.now());
        Engagement__c claims = new Engagement__c(Name='Claims Modernization', Engagement_ID__c='ENG-1002', Account__c=account.Id, Project_Manager__c=UserInfo.getUserId(), Start_Date__c=today.addMonths(-1), End_Date__c=today.addMonths(8), Status__c='Active', Revenue_Type__c='Fixed Price', Currency_Code__c='INR', PO_Value__c=69000000, Salesforce_Tower__c='Service Cloud', Industry__c='Insurance', Confidentiality__c='EXL Internal', Source_Last_Sync__c=System.now());
        insert new List<Engagement__c>{retail, claims};
        insert new List<Commercial_Reference__c>{
            new Commercial_Reference__c(Engagement__c=retail.Id, External_ID__c='SOW-R360-1001', Reference_Type__c='SOW', Value__c=84000000, Valid_From__c=retail.Start_Date__c, Valid_To__c=retail.End_Date__c, Status__c='Active', Signature__c='DEMO-SIGNATURE-1001'),
            new Commercial_Reference__c(Engagement__c=claims.Id, External_ID__c='SOW-R360-1002', Reference_Type__c='SOW', Value__c=69000000, Valid_From__c=claims.Start_Date__c, Valid_To__c=claims.End_Date__c, Status__c='Active', Signature__c='DEMO-SIGNATURE-1002')
        };

        Budget__c approvedBudget = new Budget__c(Engagement__c=retail.Id, Version__c=4, State__c='Approved', Revenue__c=84000000, Base_Labour__c=51500000, Uplift_Percent__c=5, Effort_Contingency_Percent__c=3, Expense_Contingency_Percent__c=2, Travel_Rate__c=180000, Onsite_Months__c=6, Planned_Hours__c=11680, Approval_Level__c='Auto-approved ≥30%', Submitted_By__c=UserInfo.getUserId(), Submitted_At__c=System.now(), Decision_By__c=UserInfo.getUserId(), Decision_At__c=System.now(), Decision_Note__c='Sanitized baseline approved for demo.', Economic_Signature__c='DEMO-BUDGET-1001', Idempotency_Key__c='DEMO-BUDGET-1001');
        Budget__c pendingBudget = new Budget__c(Engagement__c=claims.Id, Version__c=3, State__c='Pending Approval', Revenue__c=69000000, Base_Labour__c=45500000, Uplift_Percent__c=5, Effort_Contingency_Percent__c=4, Expense_Contingency_Percent__c=3, Travel_Rate__c=165000, Onsite_Months__c=7, Planned_Hours__c=9640, Approval_Level__c='Portfolio Manager', Submitted_By__c=UserInfo.getUserId(), Submitted_At__c=System.now(), Economic_Signature__c='DEMO-BUDGET-1002', Idempotency_Key__c='DEMO-BUDGET-1002');
        insert new List<Budget__c>{approvedBudget, pendingBudget};
        insert new List<Budget_Line__c>{
            new Budget_Line__c(Budget__c=approvedBudget.Id, Phase__c='Discover', Work_Unit__c='Architecture', Role__c='Data Cloud Architect', Location__c='Bengaluru', Period_Start__c=Date.newInstance(today.year(), today.month(), 1), Planned_Hours__c=320, Allocation_Percent__c=100, Cost_Rate__c=3200, Onsite__c=false),
            new Budget_Line__c(Budget__c=approvedBudget.Id, Phase__c='Build', Work_Unit__c='Data Cloud Foundation', Role__c='Data Cloud Consultant', Location__c='Pune', Period_Start__c=Date.newInstance(today.addMonths(1).year(), today.addMonths(1).month(), 1), Planned_Hours__c=640, Allocation_Percent__c=100, Cost_Rate__c=2400, Onsite__c=false)
        };
        Work_Unit__c workUnit = new Work_Unit__c(Name='Data Cloud Foundation', Engagement__c=retail.Id, Work_Unit_Code__c='WBS-DC-01', Phase__c='Build', Start_Date__c=today.addDays(-14), End_Date__c=today.addMonths(6), Status__c='Active');
        insert workUnit;

        Capability__c dataCloud = new Capability__c(Name='Data Cloud', Capability_ID__c='CAP-DATA-CLOUD', Type__c='Salesforce', Tower__c='Data & AI', Category__c='Cloud', Level_1_Descriptor__c='Understands Data Cloud concepts.', Level_2_Descriptor__c='Configures governed use cases.', Level_3_Descriptor__c='Leads complex implementations.', Level_4_Descriptor__c='Defines enterprise architecture and standards.', Active__c=true, Effective_From__c=today.addYears(-2));
        Capability__c mulesoft = new Capability__c(Name='API-led Connectivity', Capability_ID__c='CAP-MULE-API', Type__c='Salesforce', Tower__c='Integration', Category__c='MuleSoft', Active__c=true, Effective_From__c=today.addYears(-2));
        insert new List<Capability__c>{dataCloud, mulesoft};
        insert new List<Skill_Claim__c>{
            new Skill_Claim__c(Resource__c=aarav.Id, Capability__c=dataCloud.Id, Requested_Level__c=4, Approved_Level__c=4, Years_Experience__c=5, Last_Used__c=today, Evidence__c='Sanitized project architecture evidence.', State__c='Approved', Submitted_At__c=System.now().addDays(-10), Reviewer__c=UserInfo.getUserId(), Decision_At__c=System.now().addDays(-8), Decision_Note__c='Approved against SME descriptors.', Idempotency_Key__c='DEMO-CLAIM-1001'),
            new Skill_Claim__c(Resource__c=kabir.Id, Capability__c=mulesoft.Id, Requested_Level__c=4, Years_Experience__c=3, Last_Used__c=today, Evidence__c='Integration Factory architecture and delivery evidence.', State__c='Pending', Submitted_At__c=System.now().addDays(-1), Idempotency_Key__c='DEMO-CLAIM-1002')
        };
        insert new List<Credential__c>{
            new Credential__c(Resource__c=aarav.Id, Credential_ID__c='DEMO-DC-001', Credential_Name__c='Salesforce Data Cloud Consultant', Issuer__c='Salesforce', State__c='Verified', Issue_Date__c=today.addYears(-1), Verification_Source__c='Sanitized Credential Gateway', Verified_At__c=System.now()),
            new Credential__c(Resource__c=riya.Id, Credential_ID__c='DEMO-SC-001', Credential_Name__c='Service Cloud Consultant', Issuer__c='Salesforce', State__c='Verified', Issue_Date__c=today.addYears(-2), Verification_Source__c='Sanitized Credential Gateway', Verified_At__c=System.now())
        };

        Staffing_Request__c request = new Staffing_Request__c(Engagement__c=retail.Id, Resource__c=aarav.Id, Requested_Role__c='Data Cloud Architect', Classification__c='Billing', Start_Date__c=today.addDays(7), End_Date__c=today.addMonths(4), Daily_Hours__c=4, Priority__c='High', State__c='Pending', Requester__c=UserInfo.getUserId(), SLA_Due__c=System.now().addHours(6), Fit_Score__c=96, Requirement_Summary__c='Data Cloud SME with retail experience.', Request_Version__c=1, Idempotency_Key__c='DEMO-SR-1001');
        insert request;
        Staffing_Request__c accepted = new Staffing_Request__c(Engagement__c=claims.Id, Resource__c=riya.Id, Requested_Role__c='Service Cloud Lead', Classification__c='Billing', Start_Date__c=today.addMonths(-1), End_Date__c=today.addMonths(3), Daily_Hours__c=4, Priority__c='Normal', State__c='Accepted', Requester__c=UserInfo.getUserId(), SLA_Due__c=System.now().addDays(-5), Decision_By__c=UserInfo.getUserId(), Decision_Role__c='COE Staffer', Decision_At__c=System.now().addDays(-6), Decision_Reason__c='Capacity and budget validated.', Request_Version__c=1, Idempotency_Key__c='DEMO-SR-1002');
        insert accepted;
        Allocation__c allocation = new Allocation__c(Originating_Request__c=accepted.Id, Resource__c=riya.Id, Engagement__c=claims.Id, Role__c='Service Cloud Lead', Classification__c='Billing', Start_Date__c=accepted.Start_Date__c, End_Date__c=accepted.End_Date__c, Daily_Hours__c=4, State__c='Accepted', Version__c=1, Current__c=true);
        insert allocation;

        Date monday = mondayFor(today);
        Timesheet__c timesheet = new Timesheet__c(Resource__c=riya.Id, Week_Start__c=monday, Week_Key__c='EXL-017091-' + String.valueOf(monday), Status__c='Submitted', Submitted_At__c=System.now().addHours(-8));
        insert timesheet;
        List<Time_Entry__c> entries = new List<Time_Entry__c>();
        for (Integer day = 0; day < 5; day++) {
            Date workDate = monday.addDays(day);
            if (workDate >= allocation.Start_Date__c && workDate <= allocation.End_Date__c) {
                entries.add(new Time_Entry__c(Timesheet__c=timesheet.Id, Allocation__c=allocation.Id, Engagement__c=claims.Id, Work_Date__c=workDate, Hours__c=4, Role__c=allocation.Role__c, State__c='Submitted', Comment__c='Sanitized delivery time.', Entry_Key__c=timesheet.Id + '-' + allocation.Id + '-' + String.valueOf(workDate)));
            }
        }
        if (!entries.isEmpty()) insert entries;
        insert new List<R360_Notification__c>{
            new R360_Notification__c(Event_ID__c='DEMO-NTF-1', Recipient__c=UserInfo.getUserId(), Title__c='Staffing decision due', Message__c='SR demo request reaches SLA in six hours.', Severity__c='High', State__c='Delivered', Read__c=false, Occurred_At__c=System.now().addMinutes(-18)),
            new R360_Notification__c(Event_ID__c='DEMO-NTF-2', Recipient__c=UserInfo.getUserId(), Title__c='Budget approval required', Message__c='Claims Modernization budget v3 awaits review.', Severity__c='High', State__c='Delivered', Read__c=false, Occurred_At__c=System.now().addHours(-1))
        };
        insert new R360_Audit_Event__c(Event_ID__c='DEMO-AUD-1', Correlation_ID__c=runKey, Actor__c=UserInfo.getUserId(), Active_Role__c='Resource 360 System', Action__c='DEMO_DATA_SEEDED', Entity_Type__c='Environment', Entity_ID__c='Resource360Hub', Entity_Version__c=1, Detail__c='Compact sanitized Salesforce-native dataset loaded.', Occurred_At__c=System.now());
        return new Resource360Service.ServiceResult(true, 'Sanitized demo data loaded.', retail.Id, runKey);
    }

    private static Date mondayFor(Date value) {
        Integer days = Date.newInstance(1900, 1, 1).daysBetween(value);
        Integer offset = Math.mod(days, 7);
        return value.addDays(-offset);
    }
}
