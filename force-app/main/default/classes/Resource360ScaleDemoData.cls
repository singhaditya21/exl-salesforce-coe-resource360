/** Storage-conscious, deterministic 10-account / 20-project Resource 360 demo graph. */
public without sharing class Resource360ScaleDemoData implements Queueable {
    public static final String SCENARIO = 'R360-SCALE-10X20-V1';
    private static final Integer ACCOUNT_COUNT = 10;
    private static final Integer PROJECT_COUNT = 20;

    public void execute(QueueableContext context) {
        ensure();
    }

    public class SeedManifest {
        @AuraEnabled public Integer accounts;
        @AuraEnabled public Integer portfolios;
        @AuraEnabled public Integer subPortfolios;
        @AuraEnabled public Integer projects;
        @AuraEnabled public Integer contracts;
        @AuraEnabled public Integer payments;
        @AuraEnabled public Integer resources;
        @AuraEnabled public Integer memberships;
        @AuraEnabled public Integer modules;
        @AuraEnabled public Integer workUnits;
        @AuraEnabled public Integer dependencies;
        @AuraEnabled public Integer staffingRequests;
        @AuraEnabled public Integer allocations;
        @AuraEnabled public Integer budgets;
        @AuraEnabled public Integer skillRequirements;
        @AuraEnabled public Integer risks;
        @AuraEnabled public Integer actuals;
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult ensure() {
        Resource360CapacityService.beginDeferredRefresh();
        try{Resource360Service.ServiceResult result=ensureInternal();Resource360CapacityService.completeDeferredRefresh();return result;}catch(Exception failure){Resource360CapacityService.cancelDeferredRefresh();throw failure;}
    }

    private static Resource360Service.ServiceResult ensureInternal() {
        Date today = Date.today();
        User projectManager = demoUser('R360-DEMO-PROJECT');
        User staffer = demoUser('R360-DEMO-STAFFER');
        R360_Work_Calendar__c calendar = [SELECT Id FROM R360_Work_Calendar__c WHERE Calendar_ID__c='CAL-IN-STD' LIMIT 1];
        R360_Org_Unit__c orgUnit = [SELECT Id FROM R360_Org_Unit__c WHERE Org_Unit_ID__c='ORG-SFCOE' LIMIT 1];

        Map<Integer, Account> accounts = ensureAccounts();
        Map<Integer, R360_Portfolio__c> portfolios = ensurePortfolios(accounts, projectManager.Id, today);
        Map<String, R360_Sub_Portfolio__c> subPortfolios = ensureSubPortfolios(accounts, portfolios, projectManager.Id, today);
        List<Engagement__c> projects = ensureProjects(accounts, portfolios, subPortfolios, projectManager.Id, today);
        List<Resource__c> resources = ensureResources(calendar.Id, orgUnit.Id, today);
        Map<String, R360_Delivery_Membership__c> memberships = ensureMemberships(accounts, portfolios, subPortfolios, resources, today);
        Map<String, Project_Module__c> modules = ensureModules(projects, subPortfolios, resources, today);
        Map<String, Work_Unit__c> workUnits = ensureWorkUnits(projects, modules, resources, today);
        ensureDependencies(projects, workUnits);
        Map<String, Commercial_Reference__c> contracts = ensureContracts(projects, today);
        Map<String, Commercial_Line__c> lines = ensureContractLines(contracts, workUnits, projects);
        ensurePayments(contracts, lines, workUnits, today);
        Map<Id, Budget__c> budgets = ensureBudgets(projects, resources, workUnits, today);
        ensureCapabilitiesAndEvidence(resources, today);
        Map<String, Engagement_Skill_Requirement__c> requirements = ensureRequirements(projects, today);
        Map<String, Staffing_Request__c> staffing = ensureStaffing(projects, resources, budgets, staffer.Id, projectManager.Id, workUnits, today);
        Map<String, Allocation__c> allocations = ensureAllocations(projects, resources, memberships, staffing, staffer.Id, workUnits);
        ensureCapacityCoverage(projects,resources,memberships,budgets,workUnits,staffer.Id,projectManager.Id,today);
        ensureMatches(projects, resources, requirements, staffing, today);
        ensureRisks(projects, projectManager.Id, today);
        ensureActuals(projects, resources, allocations, workUnits, today);
        ensureCloseouts(projects, today);
        ensureAudit();

        return new Resource360Service.ServiceResult(
            true,
            'Ten Resource 360 accounts and twenty fully related projects are seeded with contracts, payments, delivery teams, modules, work, budgets, skills, risks and actuals.',
            projects[0].Id,
            SCENARIO
        );
    }

    @AuraEnabled(cacheable=true)
    public static SeedManifest manifest() {
        SeedManifest result = new SeedManifest();
        Set<String> projectCodes = new Set<String>(projectCodes());
        Set<Id> projectIds = new Set<Id>();
        for (Engagement__c project : [SELECT Id FROM Engagement__c WHERE Engagement_ID__c IN :projectCodes]) projectIds.add(project.Id);
        result.accounts = [SELECT COUNT() FROM Account WHERE R360_Demo__c=true AND R360_Account_ID__c LIKE 'R360-ACC-%'];
        result.portfolios = [SELECT COUNT() FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' OR Portfolio_ID__c LIKE 'R360-PORT-%'];
        result.subPortfolios = [SELECT COUNT() FROM R360_Sub_Portfolio__c WHERE Sub_Portfolio_ID__c LIKE 'R360-SUB-%'];
        result.projects = projectIds.size();
        result.contracts = [SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__c IN :projectIds];
        result.payments = [SELECT COUNT() FROM Contract_Payment__c WHERE Engagement__c IN :projectIds];
        result.resources = [SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'SCALE-EXL-%' OR Employee_ID__c LIKE 'DEMO-EXL-%' OR Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830')];
        result.memberships = [SELECT COUNT() FROM R360_Delivery_Membership__c WHERE Membership_ID__c LIKE 'SCALE-DM-%'];
        result.modules = [SELECT COUNT() FROM Project_Module__c WHERE Engagement__c IN :projectIds];
        result.workUnits = [SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c IN :projectIds AND Status__c!='Cancelled'];
        result.dependencies = [SELECT COUNT() FROM Work_Dependency__c WHERE Engagement__c IN :projectIds];
        result.staffingRequests = [SELECT COUNT() FROM Staffing_Request__c WHERE Engagement__c IN :projectIds];
        result.allocations = [SELECT COUNT() FROM Allocation__c WHERE Engagement__c IN :projectIds];
        result.budgets = [SELECT COUNT() FROM Budget__c WHERE Engagement__c IN :projectIds];
        result.skillRequirements = [SELECT COUNT() FROM Engagement_Skill_Requirement__c WHERE Engagement__c IN :projectIds];
        result.risks = [SELECT COUNT() FROM Project_Risk__c WHERE Engagement__c IN :projectIds];
        result.actuals = [SELECT COUNT() FROM Time_Entry__c WHERE Engagement__c IN :projectIds];
        return result;
    }

    private static Map<Integer, Account> ensureAccounts() {
        List<List<String>> definitions = new List<List<String>>{
            row('Global Retail Holdings','Retail','India','Customer - Direct'),
            row('Meridian Financial Services','Banking','United States','Customer - Direct'),
            row('Helix Health and Life Sciences','Biotechnology','United Kingdom','Customer - Direct'),
            row('Orion Manufacturing and Automotive','Manufacturing','Germany','Customer - Direct'),
            row('Terra Energy and Utilities','Energy','United States','Customer - Direct'),
            row('Nova Telecom and Media','Telecommunications','Singapore','Customer - Direct'),
            row('Horizon Travel and Hospitality','Hospitality','United Arab Emirates','Customer - Direct'),
            row('Civic Education and Public Services','Government','India','Customer - Direct'),
            row('Vertex High Tech and Logistics','Technology','United States','Customer - Direct'),
            row('Summit Consumer Goods','Apparel','France','Customer - Direct')
        };
        Map<String, Account> existingByKey = new Map<String, Account>();
        Map<String, Account> existingByName = new Map<String, Account>();
        for (Account account : [SELECT Id,Name,R360_Account_ID__c FROM Account WHERE R360_Account_ID__c LIKE 'R360-ACC-%' OR Name='Global Retail Demo']) {
            if (!String.isBlank(account.R360_Account_ID__c)) existingByKey.put(account.R360_Account_ID__c, account);
            existingByName.put(account.Name, account);
        }
        List<Account> changes = new List<Account>();
        for (Integer index = 0; index < definitions.size(); index++) {
            String key = 'R360-ACC-' + pad(index + 1);
            Account account = existingByKey.get(key);
            if (account == null && index == 0) account = existingByName.get('Global Retail Demo');
            if (account == null) account = new Account();
            account.R360_Account_ID__c = key;
            account.R360_Demo__c = true;
            account.Name = definitions[index][0];
            account.Industry = definitions[index][1];
            account.BillingCountry = definitions[index][2];
            account.Type = definitions[index][3];
            account.AnnualRevenue = 3000000000L + (index * 475000000L);
            account.NumberOfEmployees = 8000 + (index * 1250);
            account.Description = 'Sanitized enterprise account for the ' + SCENARIO + ' Resource 360 demonstration.';
            changes.add(account);
        }
        upsert changes;
        Map<Integer, Account> result = new Map<Integer, Account>();
        for (Account account : [SELECT Id,Name,R360_Account_ID__c FROM Account WHERE R360_Demo__c=true AND R360_Account_ID__c LIKE 'R360-ACC-%']) {
            result.put(Integer.valueOf(account.R360_Account_ID__c.right(2)), account);
        }
        return result;
    }

    private static Map<Integer, R360_Portfolio__c> ensurePortfolios(Map<Integer,Account> accounts, Id ownerId, Date today) {
        Map<String,R360_Portfolio__c> existing = new Map<String,R360_Portfolio__c>();
        for (R360_Portfolio__c item : [SELECT Id,Portfolio_ID__c FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' OR Portfolio_ID__c LIKE 'R360-PORT-%']) existing.put(item.Portfolio_ID__c,item);
        List<R360_Portfolio__c> changes = new List<R360_Portfolio__c>();
        for (Integer portfolioNumber = 1; portfolioNumber <= ACCOUNT_COUNT; portfolioNumber++) {
            String key = portfolioNumber == 1 ? 'PORT-SFCOE-DEMO' : 'R360-PORT-' + pad(portfolioNumber);
            R360_Portfolio__c item = existing.containsKey(key) ? new R360_Portfolio__c(Id=existing.get(key).Id) : new R360_Portfolio__c();
            item.Name = accounts.get(portfolioNumber).Name + ' Salesforce Portfolio';
            item.Portfolio_ID__c = key;
            item.Account__c = accounts.get(portfolioNumber).Id;
            item.Owner_User__c = ownerId;
            item.Effective_From__c = today.addYears(-1);
            item.Current__c = true;
            changes.add(item);
        }
        upsert changes;
        Map<Integer,R360_Portfolio__c> result = new Map<Integer,R360_Portfolio__c>();
        for (R360_Portfolio__c item : [SELECT Id,Name,Portfolio_ID__c,Account__c FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO' OR Portfolio_ID__c LIKE 'R360-PORT-%']) {
            Integer portfolioNumber = item.Portfolio_ID__c == 'PORT-SFCOE-DEMO' ? 1 : Integer.valueOf(item.Portfolio_ID__c.right(2));
            result.put(portfolioNumber,item);
        }
        return result;
    }

    private static Map<String,R360_Sub_Portfolio__c> ensureSubPortfolios(Map<Integer,Account> accounts, Map<Integer,R360_Portfolio__c> portfolios, Id ownerId, Date today) {
        List<String> towers = new List<String>{'Data and AI','Service and Experience','Integration and Platform','Revenue and Industry'};
        List<R360_Sub_Portfolio__c> records = new List<R360_Sub_Portfolio__c>();
        for (Integer accountNumber = 1; accountNumber <= ACCOUNT_COUNT; accountNumber++) {
            for (Integer child = 1; child <= 2; child++) {
                String key = 'R360-SUB-' + pad(accountNumber) + '-' + child;
                records.add(new R360_Sub_Portfolio__c(
                    Name=child==1?'Transformation Delivery':'Managed Services and Innovation',
                    Sub_Portfolio_ID__c=key,Portfolio__c=portfolios.get(accountNumber).Id,Account__c=accounts.get(accountNumber).Id,
                    Owner_User__c=ownerId,Tower__c=towers[Math.mod(accountNumber+child,towers.size())],
                    Health__c=Math.mod(accountNumber+child,5)==0?'Amber':'Green',Effective_From__c=today.addYears(-1),Current__c=true,
                    Description__c='Account-aligned delivery ownership, demand, capacity and financial control.'
                ));
            }
        }
        upsert records Sub_Portfolio_ID__c;
        Map<String,R360_Sub_Portfolio__c> result = new Map<String,R360_Sub_Portfolio__c>();
        for (R360_Sub_Portfolio__c item : [SELECT Id,Sub_Portfolio_ID__c,Portfolio__c,Account__c FROM R360_Sub_Portfolio__c WHERE Sub_Portfolio_ID__c LIKE 'R360-SUB-%']) result.put(item.Sub_Portfolio_ID__c,item);
        return result;
    }

    private static List<Engagement__c> ensureProjects(Map<Integer,Account> accounts, Map<Integer,R360_Portfolio__c> portfolios, Map<String,R360_Sub_Portfolio__c> subPortfolios, Id projectManagerId, Date today) {
        List<List<String>> definitions = projectDefinitions();
        Map<String,Engagement__c> existing = new Map<String,Engagement__c>();
        for (Engagement__c item : [SELECT Id,Engagement_ID__c FROM Engagement__c WHERE Engagement_ID__c IN :new Set<String>(projectCodes())]) existing.put(item.Engagement_ID__c,item);
        List<Engagement__c> changes = new List<Engagement__c>();
        for (Integer index=0; index<PROJECT_COUNT; index++) {
            Integer accountNumber = (index / 2) + 1;
            Integer child = Math.mod(index,2)+1;
            String code = projectCodes()[index];
            Boolean complete = new Set<Integer>{4,9,14,19}.contains(index);
            Date startDate = complete ? today.addMonths(-12-Math.mod(index,3)) : today.addMonths(-2-Math.mod(index,7));
            Date endDate = complete ? today.addDays(-15-index) : today.addMonths(5+Math.mod(index,7));
            Engagement__c item = existing.containsKey(code)?new Engagement__c(Id=existing.get(code).Id):new Engagement__c();
            item.Name=definitions[index][0];item.Engagement_ID__c=code;item.Account__c=accounts.get(accountNumber).Id;
            item.Portfolio_ID__c=portfolios.get(accountNumber).Portfolio_ID__c;item.Portfolio__c=portfolios.get(accountNumber).Id;
            item.Sub_Portfolio__c=subPortfolios.get('R360-SUB-'+pad(accountNumber)+'-'+child).Id;item.Project_Manager__c=projectManagerId;
            item.Start_Date__c=startDate;item.End_Date__c=endDate;item.Actual_End_Date__c=complete?endDate:null;
            item.Status__c=complete?'Completed':'Active';item.Lifecycle_Stage__c=complete?'Complete':'Delivery';
            item.Completion_Percent__c=complete?100:20+Math.mod(index*13,65);item.Revenue_Type__c=Math.mod(index,3)==0?'Fixed Price':'Time and Materials';
            item.Currency_Code__c='INR';item.PO_Value__c=24000000+(index*1750000);item.Salesforce_Tower__c=definitions[index][1];
            item.Industry__c=definitions[index][2];item.Confidentiality__c='EXL Internal';item.Intake_Source__c='Resource 360 scaled governed intake';
            item.Intake_Correlation_ID__c=SCENARIO+'-'+code;item.Source_Last_Sync__c=System.now();
            changes.add(item);
        }
        upsert changes Engagement_ID__c;
        Map<String,Engagement__c> byCode = new Map<String,Engagement__c>();
        for (Engagement__c item : [SELECT Id,Name,Engagement_ID__c,Account__c,Portfolio__c,Portfolio_ID__c,Sub_Portfolio__c,Start_Date__c,End_Date__c,Status__c,Completion_Percent__c FROM Engagement__c WHERE Engagement_ID__c IN :new Set<String>(projectCodes())]) byCode.put(item.Engagement_ID__c,item);
        List<Engagement__c> result = new List<Engagement__c>();for(String code:projectCodes())result.add(byCode.get(code));return result;
    }

    private static List<Resource__c> ensureResources(Id calendarId, Id orgUnitId, Date today) {
        List<Resource__c> additions = new List<Resource__c>();
        List<String> firstNames = new List<String>{'Aditi','Rohan','Nisha','Karan','Maya','Vikram','Leena','Advik','Zoya','Ishan','Kavya','Reyansh'};
        List<String> lastNames = new List<String>{'Rao','Mehta','Kapoor','Sen'};
        List<String> roles = new List<String>{'Salesforce Program Manager','Data Cloud Architect','Service Cloud Lead','MuleSoft Architect','Salesforce Developer','Quality Engineer'};
        List<String> towers = new List<String>{'Delivery','Data & AI','Service','Integration','Platform','Industry'};
        List<String> locations = new List<String>{'Bengaluru','Pune','Hyderabad','Noida','Gurugram'};
        Set<String> coreIds=new Set<String>{'EXL-017091','EXL-018462','EXL-019830'};
        Integer existingCoreCount=[SELECT COUNT() FROM Resource__c WHERE Employee_ID__c LIKE 'DEMO-EXL-%' OR Employee_ID__c IN :coreIds];
        Integer scaledResourceCount=60-existingCoreCount;
        if(scaledResourceCount<0)throw new AuraHandledException('The existing governed delivery population already exceeds the sixty-resource storage envelope.');
        for(Integer index=1;index<=scaledResourceCount;index++){
            Integer slot=index-1;String key='SCALE-EXL-'+pad(index);
            additions.add(new Resource__c(Employee_ID__c=key,Preferred_Name__c=firstNames[Math.mod(slot,firstNames.size())]+' '+lastNames[Math.mod(slot/firstNames.size(),lastNames.size())],
                Work_Email__c=key.toLowerCase()+'@example.invalid',Status__c='Active',Employment_Start__c=today.addYears(-2-Math.mod(slot,6)),Grade__c='C'+String.valueOf(1+Math.mod(slot,4)),
                Tower__c=towers[Math.mod(slot,towers.size())],Primary_Role__c=roles[Math.mod(slot,roles.size())],Location__c=locations[Math.mod(slot,locations.size())],Time_Zone__c='Asia/Kolkata',
                Org_Unit_ID__c='ORG-SFCOE',Org_Unit__c=orgUnitId,Work_Calendar__c=calendarId,Daily_Capacity_Hours__c=8,Available_Percent__c=30+Math.mod(slot*11,70),Source_Last_Sync__c=System.now()));
        }
        upsert additions Employee_ID__c;
        List<Resource__c> all=[SELECT Id,Employee_ID__c,Preferred_Name__c,Primary_Role__c,Tower__c,Location__c,Work_Calendar__c,Org_Unit__c,Org_Unit_ID__c FROM Resource__c WHERE Employee_ID__c LIKE 'SCALE-EXL-%' OR Employee_ID__c LIKE 'DEMO-EXL-%' OR Employee_ID__c IN :coreIds ORDER BY Employee_ID__c];
        List<Resource__c> fixes=new List<Resource__c>();for(Resource__c item:all){if(item.Work_Calendar__c==null||item.Org_Unit__c==null){item.Work_Calendar__c=calendarId;item.Org_Unit__c=orgUnitId;item.Org_Unit_ID__c='ORG-SFCOE';fixes.add(item);}}if(!fixes.isEmpty())update fixes;
        if(all.size()!=60)throw new AuraHandledException('The scaled delivery population must contain exactly sixty resources; found '+all.size()+'.');
        return all;
    }

    private static Map<String,R360_Delivery_Membership__c> ensureMemberships(Map<Integer,Account> accounts, Map<Integer,R360_Portfolio__c> portfolios, Map<String,R360_Sub_Portfolio__c> subPortfolios, List<Resource__c> resources, Date today) {
        List<R360_Delivery_Membership__c> records=new List<R360_Delivery_Membership__c>();
        for(Integer index=0;index<resources.size();index++){
            Integer accountNumber=Math.mod(index,ACCOUNT_COUNT)+1;Integer child=Math.mod(index/ACCOUNT_COUNT,2)+1;Resource__c resource=resources[index];
            records.add(new R360_Delivery_Membership__c(Membership_ID__c='SCALE-DM-'+pad(index+1),Portfolio__c=portfolios.get(accountNumber).Id,
                Sub_Portfolio__c=subPortfolios.get('R360-SUB-'+pad(accountNumber)+'-'+child).Id,Account__c=accounts.get(accountNumber).Id,Resource__c=resource.Id,
                Delivery_Role__c=String.isBlank(resource.Primary_Role__c)?'Salesforce Delivery Team':resource.Primary_Role__c,Capacity_Percent__c=100,Primary__c=true,
                Effective_From__c=today.addYears(-1),Current__c=true));
        }
        upsert records Membership_ID__c;
        Map<String,R360_Delivery_Membership__c> result=new Map<String,R360_Delivery_Membership__c>();
        for(R360_Delivery_Membership__c item:[SELECT Id,Membership_ID__c,Resource__c,Portfolio__c,Sub_Portfolio__c FROM R360_Delivery_Membership__c WHERE Membership_ID__c LIKE 'SCALE-DM-%'])result.put(String.valueOf(item.Resource__c)+'|'+String.valueOf(item.Portfolio__c),item);
        return result;
    }

    private static Map<String,Project_Module__c> ensureModules(List<Engagement__c> projects, Map<String,R360_Sub_Portfolio__c> subPortfolios, List<Resource__c> resources, Date today) {
        List<Project_Module__c> records=new List<Project_Module__c>();
        List<String> names=new List<String>{'Discover and Architecture','Build and Integration','Test, Release and Adoption'};
        List<String> types=new List<String>{'Discover and Design','Build and Integrate','Test and Release'};
        for(Integer p=0;p<projects.size();p++)for(Integer m=1;m<=3;m++){
            Engagement__c project=projects[p];Integer accountNumber=(p/2)+1;Date moduleStart=project.Start_Date__c.addDays((m-1)*60);Date moduleEnd=m==3?project.End_Date__c:moduleStart.addDays(75);
            if(moduleEnd>project.End_Date__c)moduleEnd=project.End_Date__c;
            Decimal completion=project.Status__c=='Completed'?100:Math.max(0,Math.min(100,project.Completion_Percent__c-((m-1)*18)));
            records.add(new Project_Module__c(Name=names[m-1],Module_ID__c='SCALE-MOD-'+pad(p+1)+'-'+m,Engagement__c=project.Id,Sub_Portfolio__c=project.Sub_Portfolio__c,
                Owner_Resource__c=resources[Math.mod((accountNumber-1)+(m-1)*ACCOUNT_COUNT,resources.size())].Id,Module_Type__c=types[m-1],
                Status__c=project.Status__c=='Completed'?'Complete':(completion>0?'Active':'Planned'),Health__c=Math.mod(p+m,7)==0?'Amber':'Green',Start_Date__c=moduleStart,End_Date__c=moduleEnd,
                Sequence__c=m*10,Completion_Percent__c=completion,Planned_Budget__c=7000000+(p*250000)+(m*500000),Actual_Cost__c=(7000000+(p*250000)+(m*500000))*(completion/100),
                Description__c='Governed module outcome with role, schedule, finance and dependency traceability.'));
        }
        upsert records Module_ID__c;
        Map<String,Project_Module__c> result=new Map<String,Project_Module__c>();for(Project_Module__c item:[SELECT Id,Module_ID__c,Engagement__c,Start_Date__c,End_Date__c FROM Project_Module__c WHERE Module_ID__c LIKE 'SCALE-MOD-%'])result.put(item.Module_ID__c,item);return result;
    }

    private static Map<String,Work_Unit__c> ensureWorkUnits(List<Engagement__c> projects, Map<String,Project_Module__c> modules, List<Resource__c> resources, Date today) {
        Set<Id> projectIds=new Map<Id,Engagement__c>(projects).keySet();Map<String,Work_Unit__c> existing=new Map<String,Work_Unit__c>();
        for(Work_Unit__c item:[SELECT Id,Engagement__c,Work_Unit_Code__c FROM Work_Unit__c WHERE Engagement__c IN :projectIds])existing.put(String.valueOf(item.Engagement__c)+'|'+item.Work_Unit_Code__c,item);
        List<Work_Unit__c> changes=new List<Work_Unit__c>();
        for(Integer p=0;p<projects.size();p++){
            Engagement__c project=projects[p];Integer accountNumber=(p/2)+1;
            if(p==0){
                List<Work_Unit__c> legacy=[SELECT Id,Sequence__c FROM Work_Unit__c WHERE Engagement__c=:project.Id];
                for(Work_Unit__c unit:legacy){Integer moduleNumber=unit.Sequence__c==null?1:Math.min(3,Math.max(1,Integer.valueOf(unit.Sequence__c/30)+1));unit.Project_Module__c=modules.get('SCALE-MOD-01-'+moduleNumber).Id;changes.add(unit);}continue;
            }
            for(Integer w=1;w<=6;w++){
                Integer moduleNumber=((w-1)/2)+1;Project_Module__c module=modules.get('SCALE-MOD-'+pad(p+1)+'-'+moduleNumber);String code='SCALE-WU-'+pad(p+1)+'-'+w;
                Work_Unit__c unit=existing.containsKey(String.valueOf(project.Id)+'|'+code)?new Work_Unit__c(Id=existing.get(String.valueOf(project.Id)+'|'+code).Id):new Work_Unit__c(Engagement__c=project.Id,Work_Unit_Code__c=code);
                Date startDate=module.Start_Date__c.addDays(Math.mod(w-1,2)*30);Date endDate=w==6?project.End_Date__c:startDate.addDays(35);if(endDate>project.End_Date__c)endDate=project.End_Date__c;
                Decimal completion=project.Status__c=='Completed'?100:Math.max(0,Math.min(100,project.Completion_Percent__c-((w-1)*9)));
                unit.Name=new List<String>{'Discovery and scope','Architecture and design','Configuration and build','Integration and migration','Testing and enablement','Release and acceptance'}[w-1];
                unit.Project_Module__c=module.Id;unit.Sequence__c=w*10;unit.Phase__c=new List<String>{'Discover','Design','Build','Build','Test','Deploy'}[w-1];unit.Start_Date__c=startDate;unit.End_Date__c=endDate;
                unit.Baseline_Start_Date__c=startDate;unit.Baseline_End_Date__c=endDate;unit.Planned_Hours__c=w==6?0:160+(w*24);unit.Daily_Hours__c=w==6?0:3;
                unit.Assigned_Resource__c=resources[Math.mod((accountNumber-1)+(w-1)*ACCOUNT_COUNT,resources.size())].Id;unit.Owner_User__c=UserInfo.getUserId();unit.Milestone__c=w==1||w==6;
                unit.Deliverable__c=true;unit.Acceptance_Required__c=true;unit.Acceptance_Status__c=project.Status__c=='Completed'?'Accepted':'Pending';unit.Accepted_By__c=project.Status__c=='Completed'?UserInfo.getUserId():null;
                unit.Accepted_At__c=project.Status__c=='Completed'?System.now().addDays(-10):null;unit.Percent_Complete__c=completion;unit.Status__c=project.Status__c=='Completed'?'Complete':(completion>0?'Active':'Planned');
                unit.Critical_Path__c=w!=4;unit.Last_Progress_Update__c=System.now();changes.add(unit);
            }
        }
        if(!changes.isEmpty())upsert changes;
        Map<String,Work_Unit__c> result=new Map<String,Work_Unit__c>();for(Work_Unit__c item:[SELECT Id,Engagement__c,Work_Unit_Code__c,End_Date__c FROM Work_Unit__c WHERE Engagement__c IN :projectIds AND Status__c!='Cancelled'])result.put(String.valueOf(item.Engagement__c)+'|'+item.Work_Unit_Code__c,item);return result;
    }

    private static void ensureDependencies(List<Engagement__c> projects, Map<String,Work_Unit__c> workUnits) {
        List<Work_Dependency__c> records=new List<Work_Dependency__c>();
        for(Integer p=1;p<projects.size();p++)for(Integer w=1;w<6;w++)records.add(new Work_Dependency__c(Engagement__c=projects[p].Id,External_ID__c='SCALE-DEP-'+pad(p+1)+'-'+w,
            Predecessor__c=workUnits.get(String.valueOf(projects[p].Id)+'|SCALE-WU-'+pad(p+1)+'-'+w).Id,Successor__c=workUnits.get(String.valueOf(projects[p].Id)+'|SCALE-WU-'+pad(p+1)+'-'+(w+1)).Id,
            Dependency_Type__c='Finish-to-Start',Lag_Days__c=Math.mod(p+w,4)==0?2:0));
        upsert records External_ID__c;
    }

    private static Map<String,Commercial_Reference__c> ensureContracts(List<Engagement__c> projects, Date today) {
        Set<Id> projectIds=new Map<Id,Engagement__c>(projects).keySet();Map<Id,Integer> contractCounts=new Map<Id,Integer>();Map<Id,Set<String>> scaleKeysByProject=new Map<Id,Set<String>>();
        for(Commercial_Reference__c existing:[SELECT Engagement__c,External_ID__c FROM Commercial_Reference__c WHERE Engagement__c IN :projectIds]){contractCounts.put(existing.Engagement__c,(contractCounts.containsKey(existing.Engagement__c)?contractCounts.get(existing.Engagement__c):0)+1);if(existing.External_ID__c!=null&&existing.External_ID__c.startsWith('SCALE-CON-')){if(!scaleKeysByProject.containsKey(existing.Engagement__c))scaleKeysByProject.put(existing.Engagement__c,new Set<String>());scaleKeysByProject.get(existing.Engagement__c).add(existing.External_ID__c);}}
        List<Commercial_Reference__c> records=new List<Commercial_Reference__c>();
        for(Integer p=0;p<projects.size();p++){
            Engagement__c project=projects[p];Integer total=contractCounts.containsKey(project.Id)?contractCounts.get(project.Id):0;Integer slot=1;
            while(total<2){String key='SCALE-CON-'+pad(p+1)+'-'+slot;slot++;if(scaleKeysByProject.containsKey(project.Id)&&scaleKeysByProject.get(project.Id).contains(key))continue;Decimal value=9000000+(p*750000)+(slot*2500000);
                records.add(new Commercial_Reference__c(Engagement__c=project.Id,External_ID__c=key,Reference_Type__c=Math.mod(slot,2)==0?'SOW':'PO',Change_Type__c='Initial',Version__c=1,
                    Approval_Status__c='Approved',Signed_Date__c=project.Start_Date__c.addDays(-20+slot),Value__c=value,Valid_From__c=project.Start_Date__c.addDays(-10),Valid_To__c=project.End_Date__c,
                    Status__c=project.Status__c=='Completed'?'Expired':'Active',Change_Reason__c=Math.mod(slot,2)==0?'Master delivery scope and acceptance terms.':'Authorized purchase order for governed delivery.',
                    Signature__c=fingerprint(key),Source_Last_Sync__c=System.now()));total++;
            }
        }
        if(!records.isEmpty())upsert records External_ID__c;
        Map<String,Commercial_Reference__c> result=new Map<String,Commercial_Reference__c>();
        for(Commercial_Reference__c item:[SELECT Id,External_ID__c,Engagement__c,Value__c,Valid_From__c,Valid_To__c FROM Commercial_Reference__c WHERE Engagement__c IN :projectIds])if(!String.isBlank(item.External_ID__c))result.put(item.External_ID__c,item);return result;
    }

    private static Map<String,Commercial_Line__c> ensureContractLines(Map<String,Commercial_Reference__c> contracts, Map<String,Work_Unit__c> workUnits, List<Engagement__c> projects) {
        List<Commercial_Line__c> records=new List<Commercial_Line__c>();Map<Id,Engagement__c> projectById=new Map<Id,Engagement__c>(projects);
        for(String contractKey:contracts.keySet())if(contractKey.startsWith('SCALE-CON-')){
            Commercial_Reference__c contract=contracts.get(contractKey);Engagement__c project=projectById.get(contract.Engagement__c);List<Work_Unit__c> projectWork=projectWorkUnits(project,workUnits);Boolean second=contractKey.endsWith('-2');Work_Unit__c unit=projectWork[Math.min(projectWork.size()-1,second ? 5 : 2)];
            Boolean complete=project.Status__c=='Completed';String key='SCALE-CL-'+contractKey;
            records.add(new Commercial_Line__c(Commercial_Reference__c=contract.Id,External_ID__c=key,Line_Type__c=second?'Acceptance Milestone':'Service',
                Description__c=second?'Release acceptance, transition and measurable outcome milestone.':'Cross-cloud implementation services and delivery capacity.',Sequence__c=second ? 20 : 10,Value__c=contract.Value__c,
                Planned_Delivery_Date__c=unit.End_Date__c,Status__c=complete?'Complete':'Active',Acceptance_Required__c=true,Acceptance_Status__c=complete?'Accepted':'Pending',
                Accepted_By__c=complete?UserInfo.getUserId():null,Accepted_At__c=complete?System.now().addDays(-10):null,Work_Unit__c=unit.Id));
        }
        if(!records.isEmpty())upsert records External_ID__c;
        Map<String,Commercial_Line__c> result=new Map<String,Commercial_Line__c>();for(Commercial_Line__c item:[SELECT Id,External_ID__c,Commercial_Reference__c,Work_Unit__c FROM Commercial_Line__c WHERE External_ID__c LIKE 'SCALE-CL-%'])result.put(String.valueOf(item.Commercial_Reference__c),item);return result;
    }

    private static void ensurePayments(Map<String,Commercial_Reference__c> contracts, Map<String,Commercial_Line__c> lines, Map<String,Work_Unit__c> workUnits, Date today) {
        List<Contract_Payment__c> records=new List<Contract_Payment__c>();
        for(String contractKey:contracts.keySet()){
            Commercial_Reference__c contract=contracts.get(contractKey);Commercial_Line__c line=lines.get(String.valueOf(contract.Id));
            if(line==null){List<Commercial_Line__c> candidates=[SELECT Id,Work_Unit__c FROM Commercial_Line__c WHERE Commercial_Reference__c=:contract.Id ORDER BY Sequence__c LIMIT 1];if(!candidates.isEmpty())line=candidates[0];}
            for(Integer sequence=1;sequence<=3;sequence++){
                Date due=contract.Valid_From__c.addDays(sequence*60);Decimal ratio=sequence==2?0.4:0.3;Decimal amount=(contract.Value__c*ratio).setScale(2);
                Boolean paid=due<today.addDays(-20);Boolean overdue=!paid&&due<today;Boolean invoiced=paid||overdue||due<=today.addDays(30);
                Decimal invoicedAmount=invoiced?amount:0;Decimal paidAmount=paid?amount:(overdue&&Math.mod(sequence+contractKey.length(),2)==0?amount*0.5:0);
                String status=paid?'Paid':(paidAmount>0?'Partially Paid':(overdue?'Overdue':(invoiced?'Invoiced':'Planned')));
                records.add(new Contract_Payment__c(Payment_ID__c='SCALE-PAY-'+contractKey+'-'+sequence,Commercial_Reference__c=contract.Id,Commercial_Line__c=line==null?null:line.Id,
                    Engagement__c=contract.Engagement__c,Work_Unit__c=line==null?null:line.Work_Unit__c,Sequence__c=sequence,Milestone__c=new List<String>{'Mobilization and design acceptance','Build milestone and invoice','Release acceptance and transition'}[sequence-1],
                    Planned_Amount__c=amount,Invoiced_Amount__c=invoicedAmount,Paid_Amount__c=paidAmount,Due_Date__c=due,Invoice_Date__c=invoiced?due.addDays(-10):null,
                    Paid_Date__c=paid?due.addDays(Math.mod(sequence,2)==0?5:-2):null,Status__c=status,Invoice_Number__c=invoiced?'INV-'+contractKey+'-'+sequence:null,Acceptance_Required__c=true));
            }
        }
        upsert records Payment_ID__c;
    }

    private static Map<Id,Budget__c> ensureBudgets(List<Engagement__c> projects, List<Resource__c> resources, Map<String,Work_Unit__c> workUnits, Date today) {
        Set<Id> projectIds=new Map<Id,Engagement__c>(projects).keySet();Map<Id,Budget__c> currentByProject=new Map<Id,Budget__c>();
        for(Budget__c item:[SELECT Id,Engagement__c,Economic_Signature__c FROM Budget__c WHERE Engagement__c IN :projectIds AND Current__c=true])if(!currentByProject.containsKey(item.Engagement__c))currentByProject.put(item.Engagement__c,item);
        List<Budget__c> additions=new List<Budget__c>();
        for(Integer p=0;p<projects.size();p++)if(!currentByProject.containsKey(projects[p].Id)){
            Decimal base=1200000+(p*50000);Decimal revenue=base*2.2;
            additions.add(new Budget__c(Engagement__c=projects[p].Id,Version__c=1,Current__c=true,State__c='Draft',Revenue__c=revenue,Base_Labour__c=base,
                Uplift_Percent__c=0.12,Effort_Contingency_Percent__c=0.08,Expense_Contingency_Percent__c=0.05,Travel_Rate__c=5000,Onsite_Months__c=1,
                Planned_Hours__c=240,Approval_Step__c=0,Policy_Version__c='R360-POLICY-2.0',Idempotency_Key__c='SCALE-BUD-'+pad(p+1)));
        }
        if(!additions.isEmpty())insert additions;
        currentByProject.clear();for(Budget__c item:[SELECT Id,Engagement__c FROM Budget__c WHERE Engagement__c IN :projectIds AND Current__c=true])if(!currentByProject.containsKey(item.Engagement__c))currentByProject.put(item.Engagement__c,item);
        Set<Id> scaleBudgetIds=new Set<Id>();for(Budget__c item:[SELECT Id FROM Budget__c WHERE Idempotency_Key__c LIKE 'SCALE-BUD-%'])scaleBudgetIds.add(item.Id);
        Map<Id,Integer> existingLines=new Map<Id,Integer>();for(AggregateResult value:[SELECT Budget__c budgetId,COUNT(Id) total FROM Budget_Line__c WHERE Budget__c IN :scaleBudgetIds GROUP BY Budget__c])existingLines.put((Id)value.get('budgetId'),Integer.valueOf(value.get('total')));
        List<Budget_Line__c> lines=new List<Budget_Line__c>();
        for(Integer p=0;p<projects.size();p++){
            Budget__c budget=currentByProject.get(projects[p].Id);if(budget==null||!scaleBudgetIds.contains(budget.Id)||existingLines.containsKey(budget.Id))continue;
            List<Work_Unit__c> projectWork=projectWorkUnits(projects[p],workUnits);
            for(Integer lineNumber=1;lineNumber<=2;lineNumber++)lines.add(new Budget_Line__c(Budget__c=budget.Id,Resource__c=resources[Math.mod(p+(lineNumber-1)*20,resources.size())].Id,
                Role_Start__c=projects[p].Start_Date__c,Role_End__c=projects[p].End_Date__c,Period_Start__c=Date.newInstance(projects[p].Start_Date__c.year(),projects[p].Start_Date__c.month(),1),
                Phase__c=lineNumber==1?'Discover':'Build',Work_Unit__c=projectWork[Math.min(projectWork.size()-1,(lineNumber-1)*2)].Work_Unit_Code__c,
                Role__c=lineNumber==1?'Salesforce Program Manager':'Salesforce Delivery Team',Location__c='India',Planned_Hours__c=120,Cost_Rate__c=(1200000+(p*50000))/240,
                Allocation_Percent__c=50,Onsite__c=lineNumber==1));
        }
        if(!lines.isEmpty())insert lines;
        List<Budget__c> signatures=[SELECT Id,Engagement__c,Version__c,Revenue__c,Base_Labour__c,Uplift_Percent__c,Effort_Contingency_Percent__c,Expense_Contingency_Percent__c,Travel_Rate__c,Onsite_Months__c,Planned_Hours__c,State__c FROM Budget__c WHERE Id IN :scaleBudgetIds];
        Map<Id,List<Budget_Line__c>> linesByBudget=new Map<Id,List<Budget_Line__c>>();for(Budget_Line__c line:[SELECT Id,Budget__c,Resource__c,Role_Start__c,Role_End__c,Period_Start__c,Phase__c,Work_Unit__c,Role__c,Location__c,Planned_Hours__c,Cost_Rate__c,Allocation_Percent__c,Onsite__c FROM Budget_Line__c WHERE Budget__c IN :scaleBudgetIds ORDER BY Period_Start__c,Phase__c,Role__c]){if(!linesByBudget.containsKey(line.Budget__c))linesByBudget.put(line.Budget__c,new List<Budget_Line__c>());linesByBudget.get(line.Budget__c).add(line);}
        for(Budget__c budget:signatures){budget.Economic_Signature__c=budgetSignature(budget,linesByBudget.get(budget.Id));budget.State__c='Approved';budget.Approval_Level__c='Approved · seeded governed demo';budget.Approval_Step__c=1;budget.Submitted_By__c=UserInfo.getUserId();budget.Submitted_At__c=System.now().addDays(-15);budget.Decision_By__c=UserInfo.getUserId();budget.Decision_At__c=System.now().addDays(-14);budget.Decision_Note__c='Approved deterministic demo economics.';}if(!signatures.isEmpty())update signatures;
        currentByProject.clear();for(Budget__c item:[SELECT Id,Engagement__c,Economic_Signature__c FROM Budget__c WHERE Engagement__c IN :projectIds AND Current__c=true])if(!currentByProject.containsKey(item.Engagement__c))currentByProject.put(item.Engagement__c,item);return currentByProject;
    }

    private static void ensureCapabilitiesAndEvidence(List<Resource__c> resources, Date today) {
        List<Capability__c> capabilities=[SELECT Id,Capability_ID__c FROM Capability__c WHERE Active__c=true ORDER BY Capability_ID__c];if(capabilities.isEmpty())throw new AuraHandledException('The governed capability catalogue must be seeded first.');
        List<Skill_Claim__c> claims=new List<Skill_Claim__c>();List<Credential__c> credentials=new List<Credential__c>();
        for(Integer index=0;index<resources.size();index++)if(resources[index].Employee_ID__c.startsWith('SCALE-EXL-')){
            Capability__c capability=capabilities[Math.mod(index,capabilities.size())];String key='SCALE-SK-'+resources[index].Employee_ID__c;
            claims.add(new Skill_Claim__c(Idempotency_Key__c=key,Resource__c=resources[index].Id,Capability__c=capability.Id,Requested_Level__c=2+Math.mod(index,3),Approved_Level__c=2+Math.mod(index,3),
                Years_Experience__c=2+Math.mod(index,8),Last_Used__c=today.addDays(-Math.mod(index*7,180)),Evidence__c='Sanitized project, credential and delivery-lead evidence for the scaled demo.',
                State__c='Approved',Submitted_At__c=System.now().addDays(-40),Reviewer__c=UserInfo.getUserId(),Decision_At__c=System.now().addDays(-38),Decision_Note__c='Approved against governed descriptors.'));
            if(Math.mod(index,4)==0)credentials.add(new Credential__c(Credential_ID__c='SCALE-CRED-'+resources[index].Employee_ID__c,Resource__c=resources[index].Id,
                Credential_Name__c='Salesforce Certified '+(Math.mod(index,2)==0?'Platform App Builder':'Associate'),Issuer__c='Salesforce',State__c='Verified',Issue_Date__c=today.addMonths(-6-Math.mod(index,18)),
                Verification_Source__c='Sanitized Salesforce credential gateway',Verified_At__c=System.now().addDays(-10)));
        }
        upsert claims Idempotency_Key__c;if(!credentials.isEmpty())upsert credentials Credential_ID__c;
    }

    private static Map<String,Engagement_Skill_Requirement__c> ensureRequirements(List<Engagement__c> projects, Date today) {
        List<Capability__c> capabilities=[SELECT Id,Capability_ID__c,Type__c FROM Capability__c WHERE Active__c=true ORDER BY Capability_ID__c];
        List<Engagement_Skill_Requirement__c> records=new List<Engagement_Skill_Requirement__c>();
        for(Integer p=1;p<projects.size();p++)for(Integer r=1;r<=3;r++){
            Capability__c capability=capabilities[Math.mod(p*3+r,capabilities.size())];String dimension=r==1?'Industry':(r==2?'Functional':'Technical');
            records.add(new Engagement_Skill_Requirement__c(Requirement_Key__c='SCALE-REQ-'+pad(p+1)+'-'+r,Engagement__c=projects[p].Id,Capability__c=capability.Id,Dimension__c=dimension,
                Required_Level__c=2+Math.mod(p+r,3),Required_Count__c=r==3?2:1,Mandatory__c=r!=2,Weight_Percent__c=r==1?25:(r==2?30:45),Requested_Role__c=r==1?'Industry Consultant':(r==2?'Functional Lead':'Technical Specialist'),
                Start_Date__c=projects[p].Start_Date__c,End_Date__c=projects[p].End_Date__c,Description__c=dimension+' capability required for governed delivery.'));
        }
        upsert records Requirement_Key__c;Map<String,Engagement_Skill_Requirement__c> result=new Map<String,Engagement_Skill_Requirement__c>();for(Engagement_Skill_Requirement__c item:[SELECT Id,Requirement_Key__c,Engagement__c,Capability__c,Required_Level__c FROM Engagement_Skill_Requirement__c WHERE Requirement_Key__c LIKE 'SCALE-REQ-%'])result.put(item.Requirement_Key__c,item);return result;
    }

    private static Map<String,Staffing_Request__c> ensureStaffing(List<Engagement__c> projects, List<Resource__c> resources, Map<Id,Budget__c> budgets, Id stafferId, Id projectManagerId, Map<String,Work_Unit__c> workUnits, Date today) {
        List<Staffing_Request__c> records=new List<Staffing_Request__c>();
        for(Integer p=1;p<projects.size();p++){
            Integer accountNumber=(p/2)+1;List<Resource__c> pool=resourcesForAccount(resources,accountNumber);List<Work_Unit__c> projectWork=projectWorkUnits(projects[p],workUnits);
            for(Integer slot=0;slot<4;slot++){
                Resource__c resource=pool[Math.mod(slot+Math.mod(p,2)*2,pool.size())];String key='SCALE-SR-'+pad(p+1)+'-'+(slot+1);Boolean complete=projects[p].Status__c=='Completed';
                records.add(new Staffing_Request__c(Idempotency_Key__c=key,Engagement__c=projects[p].Id,Resource__c=resource.Id,Work_Unit__c=projectWork[Math.min(slot,projectWork.size()-1)].Id,
                    Requested_Role__c=String.isBlank(resource.Primary_Role__c)?'Salesforce Delivery Team':resource.Primary_Role__c,Classification__c='Billing',Start_Date__c=projects[p].Start_Date__c,End_Date__c=projects[p].End_Date__c,
                    Daily_Hours__c=1,Priority__c=Math.mod(p+slot,5)==0?'High':'Normal',State__c='Accepted',Requester__c=projectManagerId,SLA_Due__c=System.now().addDays(-30),Fit_Score__c=78+Math.mod(p*5+slot*3,21),
                    Requirement_Summary__c='Industry, functional and technical fit with portfolio membership and capacity evidence.',Request_Version__c=1,Budget_Signature__c=budgets.get(projects[p].Id).Economic_Signature__c,
                    Request_Fingerprint__c=fingerprint(key),Source_Criteria__c='R360-POLICY-2.0 · capability, industry, project evidence, experience and availability.',Decision_By__c=stafferId,
                    Decision_Role__c='COE Staffer',Decision_At__c=System.now().addDays(-25),Decision_Reason__c='Budget, membership, dates, skills and capacity validated.',Decision_Correlation_ID__c=SCENARIO+'-'+key));
            }
        }
        upsert records Idempotency_Key__c;Map<String,Staffing_Request__c> result=new Map<String,Staffing_Request__c>();for(Staffing_Request__c item:[SELECT Id,Idempotency_Key__c,Engagement__c,Resource__c,Work_Unit__c,Requested_Role__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Staffing_Request__c WHERE Idempotency_Key__c LIKE 'SCALE-SR-%'])result.put(item.Idempotency_Key__c,item);return result;
    }

    private static Map<String,Allocation__c> ensureAllocations(List<Engagement__c> projects, List<Resource__c> resources, Map<String,R360_Delivery_Membership__c> memberships, Map<String,Staffing_Request__c> staffing, Id stafferId, Map<String,Work_Unit__c> workUnits) {
        Set<Id> requestIds=new Map<Id,Staffing_Request__c>(staffing.values()).keySet();Map<Id,Allocation__c> existing=new Map<Id,Allocation__c>();for(Allocation__c item:[SELECT Id,Originating_Request__c FROM Allocation__c WHERE Originating_Request__c IN :requestIds])existing.put(item.Originating_Request__c,item);
        List<Allocation__c> changes=new List<Allocation__c>();Map<String,Allocation__c> result=new Map<String,Allocation__c>();
        for(String key:staffing.keySet()){
            Staffing_Request__c request=staffing.get(key);Engagement__c project=projectById(projects,request.Engagement__c);R360_Delivery_Membership__c membership=memberships.get(String.valueOf(request.Resource__c)+'|'+String.valueOf(project.Portfolio__c));
            Allocation__c item=existing.containsKey(request.Id)?new Allocation__c(Id=existing.get(request.Id).Id):new Allocation__c(Originating_Request__c=request.Id);
            item.Resource__c=request.Resource__c;item.Engagement__c=request.Engagement__c;item.Work_Unit__c=request.Work_Unit__c;item.Delivery_Membership__c=membership==null?null:membership.Id;
            item.Role__c=request.Requested_Role__c;item.Classification__c='Billing';item.Billable_Snapshot__c=true;item.Start_Date__c=request.Start_Date__c;item.End_Date__c=request.End_Date__c;item.Daily_Hours__c=request.Daily_Hours__c;
            item.State__c=project.Status__c=='Completed'?'Ended':'Accepted';item.Version__c=1;item.Current__c=project.Status__c!='Completed';Resource360CapacityService.stampSeededPublished(item,'Scaled governed project allocation.');changes.add(item);
        }
        upsert changes;for(Allocation__c item:[SELECT Id,Originating_Request__r.Idempotency_Key__c,Resource__c,Engagement__c,Work_Unit__c,Role__c,Start_Date__c,End_Date__c,State__c FROM Allocation__c WHERE Originating_Request__c IN :requestIds])result.put(item.Originating_Request__r.Idempotency_Key__c,item);return result;
    }

    private class CapacityPlan {Resource__c resource;Engagement__c project;R360_Delivery_Membership__c membership;Work_Unit__c workUnit;Decimal hours;String key;Boolean overage;}

    private static void ensureCapacityCoverage(List<Engagement__c>projects,List<Resource__c>resources,Map<String,R360_Delivery_Membership__c>memberships,Map<Id,Budget__c>budgets,Map<String,Work_Unit__c>workUnits,Id stafferId,Id projectManagerId,Date today){
        Map<Id,Decimal>current=currentHours(resources,today);Map<Id,Engagement__c>activeByPortfolio=new Map<Id,Engagement__c>();for(Engagement__c project:projects)if(project.Status__c=='Active'&&project.End_Date__c>=today&&!activeByPortfolio.containsKey(project.Portfolio__c))activeByPortfolio.put(project.Portfolio__c,project);
        Map<Id,R360_Delivery_Membership__c>membershipByResource=new Map<Id,R360_Delivery_Membership__c>();for(R360_Delivery_Membership__c membership:memberships.values())if(!membershipByResource.containsKey(membership.Resource__c))membershipByResource.put(membership.Resource__c,membership);
        List<CapacityPlan>basePlans=new List<CapacityPlan>();for(Resource__c resource:resources){Decimal allocated=current.containsKey(resource.Id)?current.get(resource.Id):0;if(allocated>=8)continue;CapacityPlan plan=capacityPlan(resource,membershipByResource.get(resource.Id),activeByPortfolio,workUnits,8-allocated,'BASE');basePlans.add(plan);}upsertCapacityPlans(basePlans,budgets,stafferId,projectManagerId,today);
        current=currentHours(resources,today);Map<Id,Resource__c>overageByPortfolio=new Map<Id,Resource__c>();for(Resource__c resource:resources){R360_Delivery_Membership__c membership=membershipByResource.get(resource.Id);if(membership!=null&&!overageByPortfolio.containsKey(membership.Portfolio__c))overageByPortfolio.put(membership.Portfolio__c,resource);}
        List<CapacityPlan>overagePlans=new List<CapacityPlan>();for(Id portfolioId:overageByPortfolio.keySet()){Resource__c resource=overageByPortfolio.get(portfolioId);Decimal allocated=current.containsKey(resource.Id)?current.get(resource.Id):0;if(allocated>=10)continue;CapacityPlan plan=capacityPlan(resource,membershipByResource.get(resource.Id),activeByPortfolio,workUnits,10-allocated,'OVER');plan.overage=true;overagePlans.add(plan);}upsertCapacityPlans(overagePlans,budgets,stafferId,projectManagerId,today);
        Resource360CapacityService.refresh(today,new Map<Id,Resource__c>(resources).keySet());
        Set<Id>resourceIds=new Map<Id,Resource__c>(resources).keySet();Integer below=[SELECT COUNT() FROM R360_Daily_Capacity__c WHERE Work_Date__c=:today AND Resource__c IN:resourceIds AND Allocated_Hours__c<8];Integer above=[SELECT COUNT() FROM R360_Daily_Capacity__c WHERE Work_Date__c=:today AND Resource__c IN:resourceIds AND Allocated_Hours__c>12];if(below>0||above>0)throw new AuraHandledException('Demo capacity reconciliation failed: '+below+' resources below eight hours and '+above+' above the twelve-hour ceiling.');
    }

    private static CapacityPlan capacityPlan(Resource__c resource,R360_Delivery_Membership__c membership,Map<Id,Engagement__c>activeByPortfolio,Map<String,Work_Unit__c>workUnits,Decimal hours,String phase){if(membership==null||!activeByPortfolio.containsKey(membership.Portfolio__c))throw new AuraHandledException('Every demo resource needs an active portfolio project before capacity can be reconciled.');Engagement__c project=activeByPortfolio.get(membership.Portfolio__c);List<Work_Unit__c>units=projectWorkUnits(project,workUnits);CapacityPlan plan=new CapacityPlan();plan.resource=resource;plan.project=project;plan.membership=membership;plan.workUnit=units.isEmpty()?null:units[0];plan.hours=hours;plan.key='SCALE-CAP-SR-'+resource.Employee_ID__c+'-'+phase;plan.overage=false;return plan;}

    private static Map<Id,Decimal> currentHours(List<Resource__c>resources,Date today){Set<Id>ids=new Map<Id,Resource__c>(resources).keySet();Map<Id,Decimal>result=new Map<Id,Decimal>();for(AggregateResult row:[SELECT Resource__c resourceId,SUM(Daily_Hours__c) hours FROM Allocation__c WHERE Resource__c IN:ids AND State__c='Accepted' AND Current__c=true AND Start_Date__c<=:today AND End_Date__c>=:today GROUP BY Resource__c])result.put((Id)row.get('resourceId'),(Decimal)row.get('hours'));return result;}

    private static void upsertCapacityPlans(List<CapacityPlan>plans,Map<Id,Budget__c>budgets,Id stafferId,Id projectManagerId,Date today){if(plans.isEmpty())return;Set<String>keys=new Set<String>();for(CapacityPlan plan:plans)keys.add(plan.key);Map<String,Staffing_Request__c>existingRequests=new Map<String,Staffing_Request__c>();for(Staffing_Request__c request:[SELECT Id,Idempotency_Key__c FROM Staffing_Request__c WHERE Idempotency_Key__c IN:keys])existingRequests.put(request.Idempotency_Key__c,request);List<Staffing_Request__c>requests=new List<Staffing_Request__c>();for(CapacityPlan plan:plans){Staffing_Request__c request=existingRequests.containsKey(plan.key)?new Staffing_Request__c(Id=existingRequests.get(plan.key).Id):new Staffing_Request__c(Idempotency_Key__c=plan.key);request.Engagement__c=plan.project.Id;request.Resource__c=plan.resource.Id;request.Work_Unit__c=plan.workUnit==null?null:plan.workUnit.Id;request.Requested_Role__c=String.isBlank(plan.resource.Primary_Role__c)?'Salesforce Delivery Team':plan.resource.Primary_Role__c;request.Classification__c='Billing';request.Start_Date__c=today;request.End_Date__c=today;request.Daily_Hours__c=plan.hours;request.Priority__c=plan.overage?'High':'Normal';request.State__c='Accepted';request.Requester__c=projectManagerId;request.SLA_Due__c=System.now();request.Fit_Score__c=85;request.Requirement_Summary__c=plan.overage?'Approved controlled multi-project capacity exception.':'Capacity-balancing project assignment aligned to skills and delivery membership.';request.Request_Version__c=1;request.Budget_Signature__c=budgets.get(plan.project.Id).Economic_Signature__c;request.Request_Fingerprint__c=fingerprint(plan.key);request.Source_Criteria__c='R360-CAPACITY-1.0 · account, portfolio, sub-portfolio, role, skills and daily capacity.';request.Decision_By__c=stafferId;request.Decision_Role__c='COE Staffer';request.Decision_At__c=System.now();request.Decision_Reason__c=plan.overage?'Head of Delivery approved controlled over-allocation through the configured review window.':'Published within the eight-hour standard.';request.Decision_Correlation_ID__c=SCENARIO+'-'+plan.key;requests.add(request);}upsert requests Idempotency_Key__c;Map<String,Staffing_Request__c>saved=new Map<String,Staffing_Request__c>();for(Staffing_Request__c request:[SELECT Id,Idempotency_Key__c FROM Staffing_Request__c WHERE Idempotency_Key__c IN:keys])saved.put(request.Idempotency_Key__c,request);Set<Id>requestIds=new Map<Id,Staffing_Request__c>(saved.values()).keySet();Map<Id,Allocation__c>existingAllocations=new Map<Id,Allocation__c>();for(Allocation__c allocation:[SELECT Id,Originating_Request__c FROM Allocation__c WHERE Originating_Request__c IN:requestIds])existingAllocations.put(allocation.Originating_Request__c,allocation);List<Allocation__c>allocations=new List<Allocation__c>();for(CapacityPlan plan:plans){Staffing_Request__c request=saved.get(plan.key);Allocation__c allocation=existingAllocations.containsKey(request.Id)?new Allocation__c(Id=existingAllocations.get(request.Id).Id):new Allocation__c(Originating_Request__c=request.Id);allocation.Resource__c=plan.resource.Id;allocation.Engagement__c=plan.project.Id;allocation.Work_Unit__c=plan.workUnit==null?null:plan.workUnit.Id;allocation.Delivery_Membership__c=plan.membership.Id;allocation.Role__c=String.isBlank(plan.resource.Primary_Role__c)?'Salesforce Delivery Team':plan.resource.Primary_Role__c;allocation.Classification__c='Billing';allocation.Billable_Snapshot__c=true;allocation.Start_Date__c=today;allocation.End_Date__c=today;allocation.Daily_Hours__c=plan.hours;allocation.State__c='Accepted';allocation.Version__c=1;allocation.Current__c=true;Resource360CapacityService.stampSeededPublished(allocation,plan.overage?'Sanitized Head of Delivery-approved multi-project capacity exception.':'Sanitized standard-capacity publication.');allocations.add(allocation);}upsert allocations;}

    private static void ensureMatches(List<Engagement__c> projects, List<Resource__c> resources, Map<String,Engagement_Skill_Requirement__c> requirements, Map<String,Staffing_Request__c> staffing, Date today) {
        List<Staffing_Skill_Match__c> records=new List<Staffing_Skill_Match__c>();
        for(Integer p=1;p<projects.size();p++){
            Engagement_Skill_Requirement__c requirement=requirements.get('SCALE-REQ-'+pad(p+1)+'-3');Staffing_Request__c request=staffing.get('SCALE-SR-'+pad(p+1)+'-1');
            records.add(new Staffing_Skill_Match__c(Match_Key__c='SCALE-MATCH-'+pad(p+1),Staffing_Request__c=request.Id,Requirement__c=requirement.Id,Resource__c=request.Resource__c,
                Capability__c=requirement.Capability__c,Candidate_Level__c=requirement.Required_Level__c,Score__c=82+Math.mod(p*3,17),Eligible__c=true,Policy_Version__c='R360-POLICY-2.0',
                Evidence_Summary__c='Approved capability, portfolio membership, delivery evidence and available capacity.',Evaluated_At__c=System.now().addDays(-20)));
        }
        upsert records Match_Key__c;
    }

    private static void ensureRisks(List<Engagement__c> projects, Id ownerId, Date today) {
        List<Project_Risk__c> records=new List<Project_Risk__c>();
        for(Integer p=1;p<projects.size();p++)for(Integer r=1;r<=2;r++){
            Boolean complete=projects[p].Status__c=='Completed';String key='SCALE-RISK-'+pad(p+1)+'-'+r;
            records.add(new Project_Risk__c(Engagement__c=projects[p].Id,External_ID__c=key,Title__c=r==1?'Specialist capacity and dependency risk':'Commercial acceptance and payment timing',
                Description__c=r==1?'Critical skills and predecessor dates require active weekly control.':'Payment milestone depends on timely deliverable acceptance.',Severity__c=Math.mod(p+r,6)==0?'High':'Medium',
                Status__c=complete?'Closed':(r==1?'Mitigating':'Open'),Mitigation__c=r==1?'Named backup resource and weekly capacity review.':'Acceptance evidence and Finance checkpoint linked to the work unit.',
                Owner_User__c=ownerId,Due_Date__c=complete?projects[p].End_Date__c:today.addDays(14+r*7),Closed_At__c=complete?System.now().addDays(-10):null,Closure_Note__c=complete?'Closed during governed project reconciliation.':null));
        }
        upsert records External_ID__c;
    }

    private static void ensureActuals(List<Engagement__c> projects, List<Resource__c> resources, Map<String,Allocation__c> allocations, Map<String,Work_Unit__c> workUnits, Date today) {
        Date week=monday(today.addDays(-14));List<Timesheet__c> sheets=new List<Timesheet__c>();
        Set<String> existingSheetKeys=new Set<String>();for(Timesheet__c item:[SELECT Week_Key__c FROM Timesheet__c WHERE Week_Key__c LIKE 'SCALE-TS-%'])existingSheetKeys.add(item.Week_Key__c);
        for(Integer p=1;p<projects.size();p++){
            Allocation__c allocation=allocations.get('SCALE-SR-'+pad(p+1)+'-1');String key='SCALE-TS-'+pad(p+1);
            if(!existingSheetKeys.contains(key))sheets.add(new Timesheet__c(Resource__c=allocation.Resource__c,Week_Start__c=week,Week_Key__c=key,Status__c='Approved',Submitted_At__c=System.now().addDays(-10),
                Due_At__c=DateTime.newInstance(week.addDays(8),Time.newInstance(18,0,0,0)),Decision_Due_At__c=System.now().addDays(-5),Version__c=1,Current__c=true,Auto_Approved__c=false,
                Approver__c=UserInfo.getUserId(),Decision_At__c=System.now().addDays(-8),Decision_Note__c='Approved scaled delivery actuals.'));
        }
        if(!sheets.isEmpty())insert sheets;Map<String,Timesheet__c> byKey=new Map<String,Timesheet__c>();for(Timesheet__c item:[SELECT Id,Week_Key__c,Week_Start__c FROM Timesheet__c WHERE Week_Key__c LIKE 'SCALE-TS-%'])byKey.put(item.Week_Key__c,item);
        Set<String> existingEntryKeys=new Set<String>();for(Time_Entry__c item:[SELECT Entry_Key__c FROM Time_Entry__c WHERE Entry_Key__c LIKE 'SCALE-TE-%'])existingEntryKeys.add(item.Entry_Key__c);
        List<Time_Entry__c> entries=new List<Time_Entry__c>();
        for(Integer p=1;p<projects.size();p++){
            Allocation__c allocation=allocations.get('SCALE-SR-'+pad(p+1)+'-1');Timesheet__c sheet=byKey.get('SCALE-TS-'+pad(p+1));List<Work_Unit__c> projectWork=projectWorkUnits(projects[p],workUnits);
            for(Integer day=0;day<2;day++){String key='SCALE-TE-'+pad(p+1)+'-'+day;if(!existingEntryKeys.contains(key))entries.add(new Time_Entry__c(Timesheet__c=sheet.Id,Allocation__c=allocation.Id,Engagement__c=projects[p].Id,Work_Unit__c=projectWork[Math.min(day,projectWork.size()-1)].Id,
                Work_Date__c=week.addDays(day),Hours__c=3,Role__c=allocation.Role__c,State__c='Approved',Version__c=1,Comment__c='Sanitized approved delivery actual.',Entry_Key__c=key));}
        }
        if(!entries.isEmpty())insert entries;
    }

    private static void ensureCloseouts(List<Engagement__c> projects, Date today) {
        List<Project_Closeout__c> records=new List<Project_Closeout__c>();
        for(Integer p=0;p<projects.size();p++)if(projects[p].Status__c=='Completed')records.add(new Project_Closeout__c(Engagement__c=projects[p].Id,Closeout_ID__c='SCALE-CLOSE-'+pad(p+1),Version__c=1,Current__c=true,State__c='Approved',
            All_Deliverables_Accepted__c=true,Timesheets_Reconciled__c=true,Allocations_Released__c=true,Open_Risk_Count__c=0,Final_EAC__c=projects[p].Completion_Percent__c*250000,
            Final_Actual_Hours__c=2400,Completion_Date__c=projects[p].End_Date__c,Customer_Acceptance_Note__c='All governed delivery milestones accepted.',Lessons_Learned__c='Early skill validation and milestone-linked payments reduced delivery risk.',
            Submitted_By__c=UserInfo.getUserId(),Submitted_At__c=System.now().addDays(-12),Approver__c=UserInfo.getUserId(),Decision_At__c=System.now().addDays(-10),Decision_Note__c='Independent sanitized closeout approval.',Correlation_ID__c=SCENARIO+'-CLOSE-'+pad(p+1)));
        upsert records Closeout_ID__c;
    }

    private static void ensureAudit(){
        if([SELECT COUNT() FROM R360_Audit_Event__c WHERE Event_ID__c=:SCENARIO]==0)insert new R360_Audit_Event__c(Event_ID__c=SCENARIO,Correlation_ID__c=SCENARIO,Actor__c=UserInfo.getUserId(),Active_Role__c='Resource 360 System',Action__c='SCALE_DEMO_READY',Entity_Type__c='Environment',Entity_ID__c='Resource360Hub',Entity_Version__c=1,Reason_Code__c='SANITIZED_DEMO',Detail__c='Ten accounts and twenty fully related projects seeded with exact graph assurance.',Occurred_At__c=System.now());
    }

    private static User demoUser(String federationId){List<User> users=[SELECT Id FROM User WHERE FederationIdentifier=:federationId AND IsActive=true LIMIT 1];return users.isEmpty()?new User(Id=UserInfo.getUserId()):users[0];}
    private static List<String> projectCodes(){return new List<String>{'ENG-1001','ENG-1002','DEMO-ENG-1003','DEMO-ENG-1004','SCALE-ENG-1005','SCALE-ENG-1006','SCALE-ENG-1007','SCALE-ENG-1008','SCALE-ENG-1009','SCALE-ENG-1010','SCALE-ENG-1011','SCALE-ENG-1012','SCALE-ENG-1013','SCALE-ENG-1014','SCALE-ENG-1015','SCALE-ENG-1016','SCALE-ENG-1017','SCALE-ENG-1018','SCALE-ENG-1019','SCALE-ENG-1020'};}
    private static List<List<String>> projectDefinitions(){return new List<List<String>>{
        row('Global Retail Cloud','Data Cloud','Retail'),row('Consumer Loyalty Transformation','Experience Cloud','Consumer Goods'),row('Claims Modernization','Financial Services Cloud','Insurance'),row('Banking Service Modernization','Service Cloud','Banking'),
        row('Care Service Transformation','Health Cloud','Healthcare'),row('Life Sciences Data Foundation','Data Cloud','Life Sciences'),row('Manufacturing Revenue Cloud','Revenue Cloud','Manufacturing'),row('Automotive Partner Experience','Experience Cloud','Automotive'),
        row('Energy Field Service Transformation','Field Service','Energy'),row('Utilities Customer Service','Service Cloud','Utilities'),row('Telecom Subscriber 360','Data Cloud','Telecommunications'),row('Media Subscription Platform','Revenue Cloud','Media'),
        row('Travel Experience Cloud','Experience Cloud','Travel'),row('Hospitality Loyalty Cloud','Loyalty Management','Hospitality'),row('Public Sector Case Management','Public Sector Solutions','Government'),row('Education Student Success','Education Cloud','Education'),
        row('Logistics Control Tower','CRM Analytics','Transportation'),row('High Tech Revenue Operations','Revenue Cloud','High Technology'),row('Trade Promotion Modernization','Consumer Goods Cloud','Consumer Goods'),row('CPG Sales Execution','Sales Cloud','Consumer Goods')};}
    private static List<String> row(String a,String b,String c){return new List<String>{a,b,c};}
    private static List<String> row(String a,String b,String c,String d){return new List<String>{a,b,c,d};}
    private static String pad(Integer value){return value<10?'0'+String.valueOf(value):String.valueOf(value);}
    private static String fingerprint(String value){return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value)));}
    private static Date monday(Date value){return value.addDays(-Math.mod(Date.newInstance(1900,1,1).daysBetween(value),7));}
    private static Engagement__c projectById(List<Engagement__c> projects,Id projectId){for(Engagement__c project:projects)if(project.Id==projectId)return project;return null;}
    private static List<Resource__c> resourcesForAccount(List<Resource__c> resources,Integer accountNumber){List<Resource__c> result=new List<Resource__c>();for(Integer index=0;index<resources.size();index++)if(Math.mod(index,ACCOUNT_COUNT)+1==accountNumber)result.add(resources[index]);return result;}
    private static List<Work_Unit__c> projectWorkUnits(Engagement__c project,Map<String,Work_Unit__c> workUnits){List<Work_Unit__c> result=new List<Work_Unit__c>();for(Work_Unit__c item:workUnits.values())if(item.Engagement__c==project.Id)result.add(item);result.sort(new WorkUnitComparator());return result;}
    private class WorkUnitComparator implements Comparator<Work_Unit__c>{public Integer compare(Work_Unit__c left,Work_Unit__c right){return left.Work_Unit_Code__c.compareTo(right.Work_Unit_Code__c);}}
    private static String budgetSignature(Budget__c budget,List<Budget_Line__c> lines){
        if(lines==null)lines=new List<Budget_Line__c>();List<String> values=new List<String>{String.valueOf(budget.Version__c),String.valueOf(budget.Revenue__c),String.valueOf(budget.Base_Labour__c),String.valueOf(budget.Uplift_Percent__c),String.valueOf(budget.Effort_Contingency_Percent__c),String.valueOf(budget.Expense_Contingency_Percent__c),String.valueOf(budget.Travel_Rate__c),String.valueOf(budget.Onsite_Months__c),String.valueOf(budget.Planned_Hours__c)};
        for(Budget_Line__c line:lines)values.add(String.join(new List<String>{String.valueOf(line.Resource__c),String.valueOf(line.Role_Start__c),String.valueOf(line.Role_End__c),String.valueOf(line.Period_Start__c),line.Phase__c,line.Work_Unit__c,line.Role__c,line.Location__c,String.valueOf(line.Planned_Hours__c),String.valueOf(line.Cost_Rate__c),String.valueOf(line.Allocation_Percent__c),String.valueOf(line.Onsite__c)},'|'));
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(String.join(values,'||'))));
    }
}
