/** Idempotent, fictional EXL Salesforce COE project story from contract through closeout readiness. */
public without sharing class Resource360GoldenPathData {
    private static final String PROJECT_CODE='ENG-1001';
    private static final String POLICY_VERSION='R360-POLICY-2.0';

    @AuraEnabled
    public static Resource360Service.ServiceResult ensure(){
        Date today=Date.today();
        Engagement__c project=[SELECT Id,Start_Date__c,End_Date__c,Project_Manager__c,Intake_Correlation_ID__c FROM Engagement__c WHERE Engagement_ID__c=:PROJECT_CODE LIMIT 1];
        project.Lifecycle_Stage__c='Delivery';project.Completion_Percent__c=42;project.Intake_Source__c='Resource 360 governed intake';
        if(String.isBlank(project.Intake_Correlation_ID__c))project.Intake_Correlation_ID__c='GOLDEN-'+PROJECT_CODE;
        update project;

        Map<String,Resource__c>resources=resources();
        Map<String,Capability__c>capabilities=ensureCapabilities(today);
        ensureSkills(today,resources,capabilities);
        Map<String,Work_Unit__c>workUnits=ensureWorkPlan(project,today,resources);
        ensureDependencies(project.Id,workUnits);
        ensureCommercials(project,today,workUnits);
        Map<String,Engagement_Skill_Requirement__c>requirements=ensureRequirements(project,today,capabilities);
        Map<String,Staffing_Request__c>requests=ensureStaffing(project,today,resources,workUnits);
        ensureAllocations(project.Id,requests,workUnits);
        ensureSkillMatches(requests,requirements,resources,capabilities);
        ensureRisks(project,today);
        ensureDeliveryActuals(project,today,requests,workUnits);
        ensureCloseoutDraft(project);
        ensureAudit(project.Id);
        return new Resource360Service.ServiceResult(true,'EXL Salesforce COE golden path is seeded from contract through delivery and closeout readiness.',project.Id,'R360-GOLDEN-PATH-V1');
    }

    private static Map<String,Resource__c>resources(){
        Set<String>ids=new Set<String>{'EXL-018462','EXL-017091','EXL-019830','DEMO-EXL-001','DEMO-EXL-003','DEMO-EXL-007'};
        Map<String,Resource__c>result=new Map<String,Resource__c>();
        for(Resource__c resource:[SELECT Id,Employee_ID__c FROM Resource__c WHERE Employee_ID__c IN:ids])result.put(resource.Employee_ID__c,resource);
        return result;
    }

    private static Map<String,Capability__c>ensureCapabilities(Date today){
        List<Capability__c>records=new List<Capability__c>{
            capability('CAP-IND-RETAIL','Retail & Consumer','Industry','Industry','Retail',today,'Understands retail value chains.','Applies retail process knowledge.','Leads retail transformation design.','Defines retail industry solutions.'),
            capability('CAP-FUN-CUSTOMER360','Customer 360 & Loyalty','Delivery Role','Functional','Customer Experience',today,'Understands customer journeys.','Configures loyalty use cases.','Leads cross-cloud customer design.','Defines enterprise customer strategy.'),
            capability('CAP-FUN-OMNICHANNEL','Omnichannel Service','Delivery Role','Functional','Service Transformation',today,'Understands case management.','Configures digital service.','Leads omnichannel operations.','Defines service transformation standards.'),
            capability('CAP-FUN-PROGRAM','Salesforce Program Delivery','Delivery Role','Functional','Delivery Management',today,'Supports agile delivery.','Owns a workstream.','Leads multi-cloud delivery.','Governs portfolio-scale programs.'),
            capability('CAP-DATA-CLOUD','Data Cloud','Salesforce','Data & AI','Data Cloud',today,'Understands Data Cloud concepts.','Configures governed use cases.','Leads complex implementations.','Defines enterprise architecture and standards.'),
            capability('CAP-SERVICE-CLOUD','Service Cloud','Salesforce','Service','Service Cloud',today,'Understands Service Cloud.','Configures cases and routing.','Leads complex service implementations.','Defines enterprise service architecture.'),
            capability('CAP-MULE-API','API-led Connectivity','Salesforce','Integration','MuleSoft',today,'Understands API-led connectivity.','Builds governed APIs.','Leads integration delivery.','Defines enterprise integration strategy.'),
            capability('CAP-AGENTFORCE','Agentforce','Salesforce','Data & AI','Agentforce',today,'Understands agent concepts.','Configures grounded agents.','Leads production agent delivery.','Defines enterprise agent governance.'),
            capability('CAP-APEX-LWC','Apex & Lightning Web Components','Salesforce','Platform Engineering','Development',today,'Reads Apex and LWC.','Builds governed features.','Leads platform engineering.','Defines enterprise engineering standards.'),
            capability('CAP-DEVOPS','Salesforce DevOps & Release','Salesforce','Platform Engineering','DevOps',today,'Understands source-driven delivery.','Runs validated deployments.','Leads release governance.','Defines enterprise DevSecOps controls.')
        };
        upsert records Capability_ID__c;
        Map<String,Capability__c>result=new Map<String,Capability__c>();for(Capability__c record:[SELECT Id,Capability_ID__c FROM Capability__c WHERE Capability_ID__c IN:capabilityKeys()])result.put(record.Capability_ID__c,record);return result;
    }

    private static Capability__c capability(String key,String name,String type,String tower,String category,Date today,String l1,String l2,String l3,String l4){return new Capability__c(Capability_ID__c=key,Name=name,Type__c=type,Tower__c=tower,Category__c=category,Level_1_Descriptor__c=l1,Level_2_Descriptor__c=l2,Level_3_Descriptor__c=l3,Level_4_Descriptor__c=l4,Active__c=true,Effective_From__c=today.addYears(-3));}
    private static Set<String>capabilityKeys(){return new Set<String>{'CAP-IND-RETAIL','CAP-FUN-CUSTOMER360','CAP-FUN-OMNICHANNEL','CAP-FUN-PROGRAM','CAP-DATA-CLOUD','CAP-SERVICE-CLOUD','CAP-MULE-API','CAP-AGENTFORCE','CAP-APEX-LWC','CAP-DEVOPS'};}

    private static void ensureSkills(Date today,Map<String,Resource__c>resources,Map<String,Capability__c>capabilities){
        List<Skill_Claim__c>claims=new List<Skill_Claim__c>{
            claim('GOLD-SK-AARAV-DC',resources.get('EXL-018462').Id,capabilities.get('CAP-DATA-CLOUD').Id,4,6,today,'Enterprise Data Cloud architecture and identity-resolution evidence.'),
            claim('GOLD-SK-AARAV-RETAIL',resources.get('EXL-018462').Id,capabilities.get('CAP-IND-RETAIL').Id,4,5,today,'Verified retail transformation delivery evidence.'),
            claim('GOLD-SK-AARAV-C360',resources.get('EXL-018462').Id,capabilities.get('CAP-FUN-CUSTOMER360').Id,4,5,today,'Customer 360, segmentation and loyalty design evidence.'),
            claim('GOLD-SK-AARAV-PROGRAM',resources.get('EXL-018462').Id,capabilities.get('CAP-FUN-PROGRAM').Id,3,4,today,'Multi-cloud workstream leadership evidence.'),
            claim('GOLD-SK-RIYA-SERVICE',resources.get('EXL-017091').Id,capabilities.get('CAP-SERVICE-CLOUD').Id,4,6,today,'Omnichannel Service Cloud lead evidence.'),
            claim('GOLD-SK-RIYA-OMNI',resources.get('EXL-017091').Id,capabilities.get('CAP-FUN-OMNICHANNEL').Id,4,5,today,'Verified routing, case and digital engagement design.'),
            claim('GOLD-SK-RIYA-RETAIL',resources.get('EXL-017091').Id,capabilities.get('CAP-IND-RETAIL').Id,3,3,today,'Recent retail service transformation experience.'),
            claim('GOLD-SK-KABIR-MULE',resources.get('EXL-019830').Id,capabilities.get('CAP-MULE-API').Id,4,4,today,'API-led connectivity implementation evidence.'),
            claim('GOLD-SK-KABIR-DEVOPS',resources.get('EXL-019830').Id,capabilities.get('CAP-DEVOPS').Id,3,3,today,'Automated integration release evidence.'),
            claim('GOLD-SK-MEERA-DC',resources.get('DEMO-EXL-001').Id,capabilities.get('CAP-DATA-CLOUD').Id,3,3,today,'Data Cloud implementation and activation evidence.'),
            claim('GOLD-SK-ANANYA-SERVICE',resources.get('DEMO-EXL-003').Id,capabilities.get('CAP-SERVICE-CLOUD').Id,3,3,today,'Service Cloud delivery evidence.'),
            claim('GOLD-SK-SARA-AGENT',resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-AGENTFORCE').Id,3,2,today,'Grounded Agentforce pilot evidence.'),
            claim('GOLD-SK-SARA-RETAIL',resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-IND-RETAIL').Id,2,2,today,'Retail customer-service pilot evidence.'),
            claim('GOLD-SK-SARA-OMNI',resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-FUN-OMNICHANNEL').Id,2,2,today,'Agent handoff and omnichannel service-journey evidence.')
        };
        upsert claims Idempotency_Key__c;
        List<Credential__c>credentials=new List<Credential__c>{
            credential('GOLD-CRED-AARAV-DC',resources.get('EXL-018462').Id,'Salesforce Certified Data Cloud Consultant',today.addYears(-1)),
            credential('GOLD-CRED-RIYA-SC',resources.get('EXL-017091').Id,'Salesforce Certified Service Cloud Consultant',today.addYears(-2)),
            credential('GOLD-CRED-KABIR-MULE',resources.get('EXL-019830').Id,'MuleSoft Certified Developer',today.addYears(-1)),
            credential('GOLD-CRED-SARA-AI',resources.get('DEMO-EXL-007').Id,'Salesforce Certified AI Specialist',today.addMonths(-6))
        };
        upsert credentials Credential_ID__c;
    }

    private static Skill_Claim__c claim(String key,Id resourceId,Id capabilityId,Decimal level,Decimal years,Date today,String evidence){return new Skill_Claim__c(Idempotency_Key__c=key,Resource__c=resourceId,Capability__c=capabilityId,Requested_Level__c=level,Approved_Level__c=level,Years_Experience__c=years,Last_Used__c=today,Evidence__c=evidence,State__c='Approved',Submitted_At__c=System.now().addDays(-30),Reviewer__c=UserInfo.getUserId(),Decision_At__c=System.now().addDays(-28),Decision_Note__c='Approved against the governed four-level descriptor.');}
    private static Credential__c credential(String key,Id resourceId,String name,Date issued){return new Credential__c(Credential_ID__c=key,Resource__c=resourceId,Credential_Name__c=name,Issuer__c='Salesforce',State__c='Verified',Issue_Date__c=issued,Verification_Source__c='Sanitized Salesforce credential gateway',Verified_At__c=System.now());}

    private static Map<String,Work_Unit__c>ensureWorkPlan(Engagement__c project,Date today,Map<String,Resource__c>resources){
        Map<String,Work_Unit__c>existing=new Map<String,Work_Unit__c>();for(Work_Unit__c unit:[SELECT Id,Work_Unit_Code__c FROM Work_Unit__c WHERE Engagement__c=:project.Id])existing.put(unit.Work_Unit_Code__c,unit);
        // The compact V1 seed created this placeholder before the governed WBS existed.
        // Retain it for audit/history, but remove it from active planning and closeout gates.
        if(existing.containsKey('WBS-DC-01')){
            update new Work_Unit__c(Id=existing.get('WBS-DC-01').Id,Status__c='Cancelled',Percent_Complete__c=0,Acceptance_Required__c=false,Acceptance_Status__c='Not Required',Critical_Path__c=false);
        }
        List<Work_Unit__c>records=new List<Work_Unit__c>{
            workUnit(existing,'WBS-SF-01',project.Id,'Discovery & retail journeys','Discover',10,project.Start_Date__c,today.addDays(-43),160,100,'Complete',resources.get('EXL-018462').Id,true,true,true),
            workUnit(existing,'WBS-SF-02',project.Id,'Data Cloud architecture','Design',20,today.addDays(-42),today.addDays(-15),224,100,'Complete',resources.get('EXL-018462').Id,false,true,true),
            workUnit(existing,'WBS-SF-03',project.Id,'Service Cloud build','Build',30,today.addDays(-14),today.addDays(35),400,55,'Active',resources.get('EXL-017091').Id,false,true,true),
            workUnit(existing,'WBS-SF-04',project.Id,'MuleSoft integration factory','Build',40,today,today.addDays(55),336,35,'Active',resources.get('EXL-019830').Id,false,true,false),
            workUnit(existing,'WBS-SF-05',project.Id,'Agentforce service pilot','Build',50,today.addDays(36),today.addDays(84),280,0,'Planned',resources.get('DEMO-EXL-007').Id,false,true,true),
            workUnit(existing,'WBS-SF-06',project.Id,'Integrated UAT & enablement','Test',60,today.addDays(85),today.addDays(112),320,0,'Planned',resources.get('DEMO-EXL-003').Id,false,true,true),
            workUnit(existing,'WBS-SF-07',project.Id,'Production readiness gate','Deploy',70,today.addDays(113),today.addDays(113),0,0,'Planned',null,true,true,true)
        };
        upsert records;
        Map<String,Work_Unit__c>result=new Map<String,Work_Unit__c>();for(Work_Unit__c unit:[SELECT Id,Work_Unit_Code__c FROM Work_Unit__c WHERE Engagement__c=:project.Id AND Work_Unit_Code__c LIKE 'WBS-SF-%'])result.put(unit.Work_Unit_Code__c,unit);return result;
    }

    private static Work_Unit__c workUnit(Map<String,Work_Unit__c>existing,String code,Id engagementId,String name,String phase,Decimal sequence,Date startDate,Date endDate,Decimal plannedHours,Decimal percent,String status,Id resourceId,Boolean milestone,Boolean deliverable,Boolean acceptanceRequired){
        Work_Unit__c unit=existing.containsKey(code)?new Work_Unit__c(Id=existing.get(code).Id):new Work_Unit__c(Engagement__c=engagementId,Work_Unit_Code__c=code,Baseline_Start_Date__c=startDate,Baseline_End_Date__c=endDate);
        unit.Name=name;unit.Phase__c=phase;unit.Sequence__c=sequence;unit.Start_Date__c=startDate;unit.End_Date__c=endDate;unit.Planned_Hours__c=plannedHours;unit.Daily_Hours__c=resourceId==null?0:4;unit.Assigned_Resource__c=resourceId;unit.Owner_User__c=UserInfo.getUserId();unit.Milestone__c=milestone;unit.Deliverable__c=deliverable;unit.Acceptance_Required__c=acceptanceRequired;unit.Percent_Complete__c=percent;unit.Status__c=status;unit.Critical_Path__c=new Set<String>{'WBS-SF-01','WBS-SF-02','WBS-SF-03','WBS-SF-05','WBS-SF-06','WBS-SF-07'}.contains(code);unit.Last_Progress_Update__c=System.now();
        Boolean accepted=status=='Complete'&&acceptanceRequired;unit.Acceptance_Status__c=acceptanceRequired?(accepted?'Accepted':'Pending'):'Not Required';unit.Accepted_By__c=accepted?UserInfo.getUserId():null;unit.Accepted_At__c=accepted?System.now().addDays(-1):null;return unit;
    }

    private static void ensureDependencies(Id projectId,Map<String,Work_Unit__c>workUnits){
        List<Work_Dependency__c>records=new List<Work_Dependency__c>{
            dependency(projectId,'GOLD-DEP-01',workUnits.get('WBS-SF-01').Id,workUnits.get('WBS-SF-02').Id),dependency(projectId,'GOLD-DEP-02',workUnits.get('WBS-SF-02').Id,workUnits.get('WBS-SF-03').Id),dependency(projectId,'GOLD-DEP-03',workUnits.get('WBS-SF-02').Id,workUnits.get('WBS-SF-04').Id),dependency(projectId,'GOLD-DEP-04',workUnits.get('WBS-SF-03').Id,workUnits.get('WBS-SF-05').Id),dependency(projectId,'GOLD-DEP-05',workUnits.get('WBS-SF-04').Id,workUnits.get('WBS-SF-06').Id),dependency(projectId,'GOLD-DEP-06',workUnits.get('WBS-SF-05').Id,workUnits.get('WBS-SF-06').Id),dependency(projectId,'GOLD-DEP-07',workUnits.get('WBS-SF-06').Id,workUnits.get('WBS-SF-07').Id)
        };upsert records External_ID__c;
    }
    private static Work_Dependency__c dependency(Id projectId,String key,Id predecessor,Id successor){return new Work_Dependency__c(Engagement__c=projectId,External_ID__c=key,Predecessor__c=predecessor,Successor__c=successor,Dependency_Type__c='Finish-to-Start',Lag_Days__c=0);}

    private static void ensureCommercials(Engagement__c project,Date today,Map<String,Work_Unit__c>workUnits){
        Commercial_Reference__c sow=[SELECT Id,Value__c FROM Commercial_Reference__c WHERE Engagement__c=:project.Id AND External_ID__c='SOW-R360-1001' LIMIT 1];sow.Change_Type__c='Initial';sow.Version__c=1;sow.Approval_Status__c='Approved';sow.Signed_Date__c=project.Start_Date__c.addDays(-15);sow.Status__c='Active';update sow;
        List<Commercial_Reference__c>changes=new List<Commercial_Reference__c>{
            new Commercial_Reference__c(Engagement__c=project.Id,Parent_Reference__c=sow.Id,External_ID__c='AMD-R360-1001-01',Reference_Type__c='Amendment',Change_Type__c='Amendment',Version__c=2,Approval_Status__c='Approved',Signed_Date__c=today.addDays(-20),Value__c=6000000,Valid_From__c=today.addDays(-20),Valid_To__c=project.End_Date__c,Status__c='Active',Change_Reason__c='Adds governed integration factory scope.',Signature__c=fingerprint('AMD-R360-1001-01'),Source_Last_Sync__c=System.now()),
            new Commercial_Reference__c(Engagement__c=project.Id,Parent_Reference__c=sow.Id,External_ID__c='CO-R360-1001-01',Reference_Type__c='Change Order',Change_Type__c='Change Order',Version__c=3,Approval_Status__c='Approved',Signed_Date__c=today.addDays(-5),Value__c=9000000,Valid_From__c=today.addDays(-5),Valid_To__c=project.End_Date__c,Status__c='Active',Change_Reason__c='Adds the Agentforce service pilot and acceptance gate.',Signature__c=fingerprint('CO-R360-1001-01'),Source_Last_Sync__c=System.now())
        };upsert changes External_ID__c;
        Map<String,Commercial_Reference__c>refs=new Map<String,Commercial_Reference__c>();for(Commercial_Reference__c ref:[SELECT Id,External_ID__c FROM Commercial_Reference__c WHERE External_ID__c IN('SOW-R360-1001','AMD-R360-1001-01','CO-R360-1001-01')])refs.put(ref.External_ID__c,ref);
        List<Commercial_Line__c>lines=new List<Commercial_Line__c>{
            commercialLine(refs.get('SOW-R360-1001').Id,'GOLD-CL-01','Deliverable','Discovery and approved solution blueprint',10,12000000,workUnits.get('WBS-SF-01').Id,true,'Complete','Accepted'),
            commercialLine(refs.get('SOW-R360-1001').Id,'GOLD-CL-02','Deliverable','Salesforce Data Cloud architecture',20,18000000,workUnits.get('WBS-SF-02').Id,true,'Complete','Accepted'),
            commercialLine(refs.get('SOW-R360-1001').Id,'GOLD-CL-03','Service','Service Cloud implementation',30,36000000,workUnits.get('WBS-SF-03').Id,true,'Active','Pending'),
            commercialLine(refs.get('AMD-R360-1001-01').Id,'GOLD-CL-04','Service','MuleSoft integration factory',40,6000000,workUnits.get('WBS-SF-04').Id,false,'Active','Not Required'),
            commercialLine(refs.get('CO-R360-1001-01').Id,'GOLD-CL-05','Acceptance Milestone','Agentforce pilot acceptance',50,9000000,workUnits.get('WBS-SF-05').Id,true,'Planned','Pending'),
            commercialLine(refs.get('SOW-R360-1001').Id,'GOLD-CL-06','Acceptance Milestone','Production readiness acceptance',60,18000000,workUnits.get('WBS-SF-07').Id,true,'Planned','Pending')
        };upsert lines External_ID__c;
    }
    private static Commercial_Line__c commercialLine(Id refId,String key,String type,String description,Decimal sequence,Decimal value,Id workUnitId,Boolean acceptance,String status,String acceptanceStatus){Work_Unit__c unit=[SELECT End_Date__c FROM Work_Unit__c WHERE Id=:workUnitId];Boolean accepted=acceptanceStatus=='Accepted';return new Commercial_Line__c(Commercial_Reference__c=refId,External_ID__c=key,Line_Type__c=type,Description__c=description,Sequence__c=sequence,Value__c=value,Planned_Delivery_Date__c=unit.End_Date__c,Status__c=status,Acceptance_Required__c=acceptance,Acceptance_Status__c=acceptanceStatus,Accepted_By__c=accepted?UserInfo.getUserId():null,Accepted_At__c=accepted?System.now().addDays(-1):null,Work_Unit__c=workUnitId);}

    private static Map<String,Engagement_Skill_Requirement__c>ensureRequirements(Engagement__c project,Date today,Map<String,Capability__c>capabilities){
        List<Engagement_Skill_Requirement__c>records=new List<Engagement_Skill_Requirement__c>{
            requirement(project.Id,'GOLD-REQ-DC-IND',capabilities.get('CAP-IND-RETAIL').Id,'Industry',3,20,'Data Cloud Architect',today.addDays(-42),today.addDays(-15),'Recent retail transformation evidence.'),
            requirement(project.Id,'GOLD-REQ-DC-FUN',capabilities.get('CAP-FUN-CUSTOMER360').Id,'Functional',4,30,'Data Cloud Architect',today.addDays(-42),today.addDays(-15),'Customer 360 and loyalty design.'),
            requirement(project.Id,'GOLD-REQ-DC-TECH',capabilities.get('CAP-DATA-CLOUD').Id,'Technical',4,50,'Data Cloud Architect',today.addDays(-42),today.addDays(-15),'Data Cloud architecture at expert level.'),
            requirement(project.Id,'GOLD-REQ-SC-IND',capabilities.get('CAP-IND-RETAIL').Id,'Industry',3,20,'Service Cloud Lead',today.addDays(-14),today.addDays(35),'Retail service operations.'),
            requirement(project.Id,'GOLD-REQ-SC-FUN',capabilities.get('CAP-FUN-OMNICHANNEL').Id,'Functional',4,30,'Service Cloud Lead',today.addDays(-14),today.addDays(35),'Omnichannel case and routing design.'),
            requirement(project.Id,'GOLD-REQ-SC-TECH',capabilities.get('CAP-SERVICE-CLOUD').Id,'Technical',4,50,'Service Cloud Lead',today.addDays(-14),today.addDays(35),'Service Cloud solution leadership.'),
            requirement(project.Id,'GOLD-REQ-MULE-TECH',capabilities.get('CAP-MULE-API').Id,'Technical',4,70,'MuleSoft Developer',today,today.addDays(55),'API-led integration implementation.'),
            requirement(project.Id,'GOLD-REQ-MULE-FUN',capabilities.get('CAP-DEVOPS').Id,'Functional',3,30,'MuleSoft Developer',today,today.addDays(55),'Automated release and quality gates.'),
            requirement(project.Id,'GOLD-REQ-AI-IND',capabilities.get('CAP-IND-RETAIL').Id,'Industry',2,20,'AI Cloud Consultant',today.addDays(36),today.addDays(84),'Retail service process grounding.'),
            requirement(project.Id,'GOLD-REQ-AI-FUN',capabilities.get('CAP-FUN-OMNICHANNEL').Id,'Functional',2,20,'AI Cloud Consultant',today.addDays(36),today.addDays(84),'Agent handoff and service journeys.'),
            requirement(project.Id,'GOLD-REQ-AI-TECH',capabilities.get('CAP-AGENTFORCE').Id,'Technical',3,60,'AI Cloud Consultant',today.addDays(36),today.addDays(84),'Grounded Agentforce implementation.')
        };upsert records Requirement_Key__c;Map<String,Engagement_Skill_Requirement__c>result=new Map<String,Engagement_Skill_Requirement__c>();for(Engagement_Skill_Requirement__c record:[SELECT Id,Requirement_Key__c FROM Engagement_Skill_Requirement__c WHERE Requirement_Key__c LIKE 'GOLD-REQ-%'])result.put(record.Requirement_Key__c,record);return result;
    }
    private static Engagement_Skill_Requirement__c requirement(Id engagementId,String key,Id capabilityId,String dimension,Decimal level,Decimal weight,String role,Date startDate,Date endDate,String description){return new Engagement_Skill_Requirement__c(Engagement__c=engagementId,Requirement_Key__c=key,Capability__c=capabilityId,Dimension__c=dimension,Required_Level__c=level,Weight_Percent__c=weight,Mandatory__c=true,Requested_Role__c=role,Required_Count__c=1,Start_Date__c=startDate,End_Date__c=endDate,Description__c=description);}

    private static Map<String,Staffing_Request__c>ensureStaffing(Engagement__c project,Date today,Map<String,Resource__c>resources,Map<String,Work_Unit__c>workUnits){
        Budget__c budget=[SELECT Economic_Signature__c FROM Budget__c WHERE Engagement__c=:project.Id AND Current__c=true AND State__c='Approved' LIMIT 1];Id staffer=userId('R360-DEMO-STAFFER');
        List<Staffing_Request__c>records=new List<Staffing_Request__c>{
            staffing('GOLD-SR-DC',project.Id,resources.get('EXL-018462').Id,workUnits.get('WBS-SF-02').Id,'Data Cloud Architect',today.addDays(-42),today.addDays(-15),4,98,budget.Economic_Signature__c,staffer,'Industry, functional and technical hard gates passed.'),
            staffing('GOLD-SR-SC',project.Id,resources.get('EXL-017091').Id,workUnits.get('WBS-SF-03').Id,'Service Cloud Lead',today.addDays(-14),today.addDays(35),4,96,budget.Economic_Signature__c,staffer,'Retail, omnichannel and Service Cloud evidence passed.'),
            staffing('GOLD-SR-MULE',project.Id,resources.get('EXL-019830').Id,workUnits.get('WBS-SF-04').Id,'MuleSoft Developer',today,today.addDays(55),4,94,budget.Economic_Signature__c,staffer,'MuleSoft and release-governance evidence passed.'),
            staffing('GOLD-SR-AI',project.Id,resources.get('DEMO-EXL-007').Id,workUnits.get('WBS-SF-05').Id,'AI Cloud Consultant',today.addDays(36),today.addDays(84),4,91,budget.Economic_Signature__c,staffer,'Retail and Agentforce evidence passed with a functional coaching plan.')
        };upsert records Idempotency_Key__c;Map<String,Staffing_Request__c>result=new Map<String,Staffing_Request__c>();for(Staffing_Request__c record:[SELECT Id,Idempotency_Key__c,Resource__c,Work_Unit__c,Requested_Role__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Staffing_Request__c WHERE Idempotency_Key__c LIKE 'GOLD-SR-%'])result.put(record.Idempotency_Key__c,record);return result;
    }
    private static Staffing_Request__c staffing(String key,Id engagementId,Id resourceId,Id workUnitId,String role,Date startDate,Date endDate,Decimal hours,Decimal fit,String signature,Id staffer,String decision){return new Staffing_Request__c(Idempotency_Key__c=key,Engagement__c=engagementId,Resource__c=resourceId,Work_Unit__c=workUnitId,Requested_Role__c=role,Classification__c='Billing',Start_Date__c=startDate,End_Date__c=endDate,Daily_Hours__c=hours,Priority__c='High',State__c='Accepted',Requester__c=UserInfo.getUserId(),SLA_Due__c=System.now().addDays(-10),Fit_Score__c=fit,Requirement_Summary__c='Weighted industry, functional and technical match.',Source_Criteria__c='R360-GOLDEN-PATH-V1',Request_Version__c=1,Budget_Signature__c=signature,Request_Fingerprint__c=fingerprint(key),Decision_By__c=staffer,Decision_Role__c='COE Staffer',Decision_At__c=System.now().addDays(-9),Decision_Reason__c=decision,Decision_Correlation_ID__c='GOLD-DECISION-'+key);}

    private static void ensureAllocations(Id projectId,Map<String,Staffing_Request__c>requests,Map<String,Work_Unit__c>workUnits){
        Set<Id>requestIds=new Set<Id>();for(Staffing_Request__c request:requests.values())requestIds.add(request.Id);Map<Id,Allocation__c>existing=new Map<Id,Allocation__c>();for(Allocation__c allocation:[SELECT Id,Originating_Request__c FROM Allocation__c WHERE Originating_Request__c IN:requestIds AND Current__c=true])existing.put(allocation.Originating_Request__c,allocation);
        List<Allocation__c>records=new List<Allocation__c>();for(Staffing_Request__c request:requests.values()){Allocation__c allocation=existing.containsKey(request.Id)?new Allocation__c(Id=existing.get(request.Id).Id):new Allocation__c(Originating_Request__c=request.Id);allocation.Resource__c=request.Resource__c;allocation.Engagement__c=projectId;allocation.Work_Unit__c=request.Work_Unit__c;allocation.Role__c=request.Requested_Role__c;allocation.Classification__c='Billing';allocation.Billable_Snapshot__c=true;allocation.Start_Date__c=request.Start_Date__c;allocation.End_Date__c=request.End_Date__c;allocation.Daily_Hours__c=request.Daily_Hours__c;allocation.State__c='Accepted';allocation.Version__c=1;allocation.Current__c=true;records.add(allocation);}upsert records;
    }

    private static void ensureSkillMatches(Map<String,Staffing_Request__c>requests,Map<String,Engagement_Skill_Requirement__c>requirements,Map<String,Resource__c>resources,Map<String,Capability__c>capabilities){
        List<Staffing_Skill_Match__c>matches=new List<Staffing_Skill_Match__c>{
            match('GOLD-MATCH-DC-IND',requests.get('GOLD-SR-DC').Id,requirements.get('GOLD-REQ-DC-IND').Id,resources.get('EXL-018462').Id,capabilities.get('CAP-IND-RETAIL').Id,4,20),match('GOLD-MATCH-DC-FUN',requests.get('GOLD-SR-DC').Id,requirements.get('GOLD-REQ-DC-FUN').Id,resources.get('EXL-018462').Id,capabilities.get('CAP-FUN-CUSTOMER360').Id,4,30),match('GOLD-MATCH-DC-TECH',requests.get('GOLD-SR-DC').Id,requirements.get('GOLD-REQ-DC-TECH').Id,resources.get('EXL-018462').Id,capabilities.get('CAP-DATA-CLOUD').Id,4,50),
            match('GOLD-MATCH-SC-IND',requests.get('GOLD-SR-SC').Id,requirements.get('GOLD-REQ-SC-IND').Id,resources.get('EXL-017091').Id,capabilities.get('CAP-IND-RETAIL').Id,3,20),match('GOLD-MATCH-SC-FUN',requests.get('GOLD-SR-SC').Id,requirements.get('GOLD-REQ-SC-FUN').Id,resources.get('EXL-017091').Id,capabilities.get('CAP-FUN-OMNICHANNEL').Id,4,30),match('GOLD-MATCH-SC-TECH',requests.get('GOLD-SR-SC').Id,requirements.get('GOLD-REQ-SC-TECH').Id,resources.get('EXL-017091').Id,capabilities.get('CAP-SERVICE-CLOUD').Id,4,50),
            match('GOLD-MATCH-MULE-TECH',requests.get('GOLD-SR-MULE').Id,requirements.get('GOLD-REQ-MULE-TECH').Id,resources.get('EXL-019830').Id,capabilities.get('CAP-MULE-API').Id,4,70),match('GOLD-MATCH-MULE-FUN',requests.get('GOLD-SR-MULE').Id,requirements.get('GOLD-REQ-MULE-FUN').Id,resources.get('EXL-019830').Id,capabilities.get('CAP-DEVOPS').Id,3,30),
            match('GOLD-MATCH-AI-IND',requests.get('GOLD-SR-AI').Id,requirements.get('GOLD-REQ-AI-IND').Id,resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-IND-RETAIL').Id,2,20),match('GOLD-MATCH-AI-TECH',requests.get('GOLD-SR-AI').Id,requirements.get('GOLD-REQ-AI-TECH').Id,resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-AGENTFORCE').Id,3,60),match('GOLD-MATCH-AI-FUN',requests.get('GOLD-SR-AI').Id,requirements.get('GOLD-REQ-AI-FUN').Id,resources.get('DEMO-EXL-007').Id,capabilities.get('CAP-FUN-OMNICHANNEL').Id,2,20)
        };upsert matches Match_Key__c;
    }
    private static Staffing_Skill_Match__c match(String key,Id requestId,Id requirementId,Id resourceId,Id capabilityId,Decimal level,Decimal score){return new Staffing_Skill_Match__c(Match_Key__c=key,Staffing_Request__c=requestId,Requirement__c=requirementId,Resource__c=resourceId,Capability__c=capabilityId,Candidate_Level__c=level,Score__c=score,Eligible__c=true,Evidence_Summary__c='Approved capability claim and recent project evidence verified.',Evaluated_At__c=System.now(),Policy_Version__c=POLICY_VERSION);}

    private static void ensureRisks(Engagement__c project,Date today){List<Project_Risk__c>risks=new List<Project_Risk__c>{new Project_Risk__c(Engagement__c=project.Id,External_ID__c='GOLD-RISK-01',Title__c='Consent and identity-resolution readiness',Description__c='Fictional retail consent mappings require customer confirmation before production activation.',Severity__c='High',Status__c='Mitigating',Owner_User__c=project.Project_Manager__c,Due_Date__c=today.addDays(21),Mitigation__c='Complete consent workshops, mapping evidence and privacy sign-off in the demo workflow.'),new Project_Risk__c(Engagement__c=project.Id,External_ID__c='GOLD-RISK-02',Title__c='Integration release rehearsal',Description__c='Deployment runbook needed an additional rehearsal.',Severity__c='Medium',Status__c='Closed',Owner_User__c=project.Project_Manager__c,Due_Date__c=today.addDays(-7),Mitigation__c='Execute rehearsal and retain validation evidence.',Closed_At__c=System.now().addDays(-5),Closure_Note__c='Rehearsal completed; rollback and monitoring evidence retained.')};upsert risks External_ID__c;}

    private static void ensureDeliveryActuals(Engagement__c project,Date today,Map<String,Staffing_Request__c>requests,Map<String,Work_Unit__c>workUnits){
        Map<Id,Allocation__c>allocationByRequest=new Map<Id,Allocation__c>();for(Allocation__c allocation:[SELECT Id,Originating_Request__c FROM Allocation__c WHERE Originating_Request__c IN:requests.values() AND Current__c=true])allocationByRequest.put(allocation.Originating_Request__c,allocation);
        Date week=monday(today.addDays(-7));Set<String>sheetKeys=new Set<String>{'GOLD-TS-SC-'+week+'-V1','GOLD-TS-MULE-'+week+'-V1'};Set<String>existingSheetKeys=new Set<String>();for(Timesheet__c existing:[SELECT Week_Key__c FROM Timesheet__c WHERE Week_Key__c IN:sheetKeys])existingSheetKeys.add(existing.Week_Key__c);List<Timesheet__c>sheets=new List<Timesheet__c>();if(!existingSheetKeys.contains('GOLD-TS-SC-'+week+'-V1'))sheets.add(timesheet('GOLD-TS-SC-'+week+'-V1',requests.get('GOLD-SR-SC').Resource__c,week));if(!existingSheetKeys.contains('GOLD-TS-MULE-'+week+'-V1'))sheets.add(timesheet('GOLD-TS-MULE-'+week+'-V1',requests.get('GOLD-SR-MULE').Resource__c,week));if(!sheets.isEmpty())insert sheets;
        Map<String,Timesheet__c>byKey=new Map<String,Timesheet__c>();for(Timesheet__c sheet:[SELECT Id,Week_Key__c FROM Timesheet__c WHERE Week_Key__c IN:sheetKeys])byKey.put(sheet.Week_Key__c,sheet);
        Set<String>entryKeys=new Set<String>{'GOLD-TE-SC-'+week,'GOLD-TE-MULE-'+week};Set<String>existingEntryKeys=new Set<String>();for(Time_Entry__c existing:[SELECT Entry_Key__c FROM Time_Entry__c WHERE Entry_Key__c IN:entryKeys])existingEntryKeys.add(existing.Entry_Key__c);List<Time_Entry__c>entries=new List<Time_Entry__c>();if(!existingEntryKeys.contains('GOLD-TE-SC-'+week))entries.add(new Time_Entry__c(Timesheet__c=byKey.get('GOLD-TS-SC-'+week+'-V1').Id,Allocation__c=allocationByRequest.get(requests.get('GOLD-SR-SC').Id).Id,Engagement__c=project.Id,Work_Unit__c=workUnits.get('WBS-SF-03').Id,Work_Date__c=week,Hours__c=8,Role__c='Service Cloud Lead',State__c='Approved',Comment__c='Service Cloud sprint delivery.',Entry_Key__c='GOLD-TE-SC-'+week,Version__c=1));if(!existingEntryKeys.contains('GOLD-TE-MULE-'+week))entries.add(new Time_Entry__c(Timesheet__c=byKey.get('GOLD-TS-MULE-'+week+'-V1').Id,Allocation__c=allocationByRequest.get(requests.get('GOLD-SR-MULE').Id).Id,Engagement__c=project.Id,Work_Unit__c=workUnits.get('WBS-SF-04').Id,Work_Date__c=week,Hours__c=8,Role__c='MuleSoft Developer',State__c='Approved',Comment__c='API implementation and automated validation.',Entry_Key__c='GOLD-TE-MULE-'+week,Version__c=1));if(!entries.isEmpty())insert entries;
    }
    private static Timesheet__c timesheet(String key,Id resourceId,Date week){return new Timesheet__c(Resource__c=resourceId,Week_Start__c=week,Week_Key__c=key,Status__c='Approved',Submitted_At__c=System.now().addDays(-5),Due_At__c=System.now().addDays(-4),Decision_Due_At__c=System.now().addDays(-3),Approver__c=UserInfo.getUserId(),Decision_At__c=System.now().addDays(-3),Decision_Note__c='Allocation, work unit and daily capacity reconciled.',Version__c=1,Current__c=true,Auto_Approved__c=false);}

    private static void ensureCloseoutDraft(Engagement__c project){Project_Closeout__c draft=new Project_Closeout__c(Closeout_ID__c='GOLD-CLOSEOUT-'+PROJECT_CODE,Engagement__c=project.Id,State__c='Draft',Version__c=1,Current__c=true,Completion_Date__c=project.End_Date__c,All_Deliverables_Accepted__c=false,Timesheets_Reconciled__c=false,Allocations_Released__c=false,Open_Risk_Count__c=1,Lessons_Learned__c='Draft: preserve early architecture validation and weekly skill-fit reviews.',Customer_Acceptance_Note__c='Pending final UAT and production-readiness acceptance.');upsert draft Closeout_ID__c;}
    private static void ensureAudit(Id projectId){if([SELECT COUNT() FROM R360_Audit_Event__c WHERE Event_ID__c='GOLD-AUDIT-PATH-V1']==0)insert new R360_Audit_Event__c(Event_ID__c='GOLD-AUDIT-PATH-V1',Correlation_ID__c='R360-GOLDEN-PATH-V1',Actor__c=UserInfo.getUserId(),Active_Role__c='Resource 360 System',Action__c='GOLDEN_PATH_READY',Entity_Type__c='Engagement__c',Entity_ID__c=String.valueOf(projectId),Entity_Version__c=1,Reason_Code__c='SANITIZED_DEMO',Detail__c='Contract, budget, skill demand, staffing evidence, allocation, Gantt delivery, risk, time, acceptance and closeout-readiness fixtures are linked.',Occurred_At__c=System.now());}
    private static Id userId(String federationId){List<User>users=[SELECT Id FROM User WHERE FederationIdentifier=:federationId AND IsActive=true LIMIT 1];return users.isEmpty()?UserInfo.getUserId():users[0].Id;}
    private static Date monday(Date value){Integer days=Date.newInstance(1900,1,1).daysBetween(value);return value.addDays(-Math.mod(days,7));}
    private static String fingerprint(String value){return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value)));}
}
