public inherited sharing class Resource360GovernanceService {
    public class SourceContract {
        @AuraEnabled public String id;
        @AuraEnabled public String source;
        @AuraEnabled public String entity;
        @AuraEnabled public String identity;
        @AuraEnabled public String canonicalFields;
        @AuraEnabled public String owner;
        @AuraEnabled public Integer cadenceHours;
        @AuraEnabled public Boolean blocking;
        @AuraEnabled public String classification;
        @AuraEnabled public String endpointAlias;
        @AuraEnabled public String direction;
        @AuraEnabled public String contractVersion;
        @AuraEnabled public String approvalStatus;
        @AuraEnabled public Date approvedOn;
    }
    public class PersonaMapping {
        @AuraEnabled public String id;
        @AuraEnabled public String businessRole;
        @AuraEnabled public String permissionSetGroup;
        @AuraEnabled public String entraGroupAlias;
        @AuraEnabled public String scopeType;
        @AuraEnabled public String decisionAuthority;
        @AuraEnabled public String segregationClass;
        @AuraEnabled public Boolean delegationAllowed;
        @AuraEnabled public String licenseAssumption;
        @AuraEnabled public String controlOwner;
        @AuraEnabled public String approvalStatus;
    }
    public class RetentionRule {
        @AuraEnabled public String id;
        @AuraEnabled public String category;
        @AuraEnabled public Integer retentionDays;
        @AuraEnabled public Boolean legalHoldEligible;
        @AuraEnabled public String dispositionAction;
        @AuraEnabled public Integer recoveryWindowDays;
        @AuraEnabled public String controlOwner;
        @AuraEnabled public String approvalStatus;
        @AuraEnabled public String evidenceReference;
    }

    @AuraEnabled(cacheable=true)
    public static String governanceSnapshot() {
        List<SourceContract> sources = sourceContracts();
        List<PersonaMapping> personas = personaMappings();
        List<RetentionRule> retention = retentionRules();
        return JSON.serialize(new Map<String,Object>{
            'mock' => true,
            'decisionId' => 'R360-MOCK-ACTIVATION-2026-08-24',
            'contractVersion' => currentContractVersion(),
            'sourceContracts' => sources,
            'personas' => personas,
            'retentionRules' => retention,
            'sourceContractsApproved' => allSourcesApproved(sources),
            'personaMappingsApproved' => allPersonasApproved(personas),
            'retentionRulesApproved' => allRetentionApproved(retention),
            'notice' => 'All values are approved deterministic mock assumptions. No EXL production identity, endpoint, assignee or legal decision is represented.'
        });
    }

    public static List<SourceContract> sourceContracts() {
        List<SourceContract> result = new List<SourceContract>();
        List<R360_Source_Contract__mdt> definitions = [
            SELECT DeveloperName, MasterLabel, Contract_Version__c, Entity_Type__c,
                Authoritative_Source__c, Stable_Identity__c, Canonical_Fields__c,
                Data_Owner__c, Freshness_Hours__c, Blocking__c,
                Data_Classification__c, Endpoint_Alias__c, Direction__c,
                Approval_Status__c, Approved_On__c
            FROM R360_Source_Contract__mdt WHERE Active__c = true
            ORDER BY MasterLabel
        ];
        for (R360_Source_Contract__mdt definition : definitions) {
            SourceContract item = new SourceContract();
            item.id = definition.DeveloperName;
            item.source = definition.Authoritative_Source__c;
            item.entity = definition.Entity_Type__c;
            item.identity = definition.Stable_Identity__c;
            item.canonicalFields = definition.Canonical_Fields__c;
            item.owner = definition.Data_Owner__c;
            item.cadenceHours = definition.Freshness_Hours__c == null ? 0 : Integer.valueOf(definition.Freshness_Hours__c);
            item.blocking = definition.Blocking__c;
            item.classification = definition.Data_Classification__c;
            item.endpointAlias = definition.Endpoint_Alias__c;
            item.direction = definition.Direction__c;
            item.contractVersion = definition.Contract_Version__c;
            item.approvalStatus = definition.Approval_Status__c;
            item.approvedOn = definition.Approved_On__c;
            result.add(item);
        }
        return result;
    }

    public static List<PersonaMapping> personaMappings() {
        List<PersonaMapping> result = new List<PersonaMapping>();
        for (R360_Persona__mdt definition : [
            SELECT DeveloperName, Business_Role__c, Permission_Set_Group__c,
                Entra_Group_Alias__c, Scope_Type__c, Decision_Authority__c,
                Segregation_Class__c, Delegation_Allowed__c, License_Assumption__c,
                Control_Owner__c, Approval_Status__c
            FROM R360_Persona__mdt WHERE Active__c = true ORDER BY Business_Role__c
        ]) {
            PersonaMapping item = new PersonaMapping();
            item.id = definition.DeveloperName;
            item.businessRole = definition.Business_Role__c;
            item.permissionSetGroup = definition.Permission_Set_Group__c;
            item.entraGroupAlias = definition.Entra_Group_Alias__c;
            item.scopeType = definition.Scope_Type__c;
            item.decisionAuthority = definition.Decision_Authority__c;
            item.segregationClass = definition.Segregation_Class__c;
            item.delegationAllowed = definition.Delegation_Allowed__c;
            item.licenseAssumption = definition.License_Assumption__c;
            item.controlOwner = definition.Control_Owner__c;
            item.approvalStatus = definition.Approval_Status__c;
            result.add(item);
        }
        return result;
    }

    public static List<RetentionRule> retentionRules() {
        List<RetentionRule> result = new List<RetentionRule>();
        for (R360_Retention_Rule__mdt definition : [
            SELECT DeveloperName, Record_Category__c, Retention_Days__c,
                Legal_Hold_Eligible__c, Disposition_Action__c, Recovery_Window_Days__c,
                Control_Owner__c, Approval_Status__c, Evidence_Reference__c
            FROM R360_Retention_Rule__mdt WHERE Active__c = true ORDER BY Record_Category__c
        ]) {
            RetentionRule item = new RetentionRule();
            item.id = definition.DeveloperName;
            item.category = definition.Record_Category__c;
            item.retentionDays = Integer.valueOf(definition.Retention_Days__c);
            item.legalHoldEligible = definition.Legal_Hold_Eligible__c;
            item.dispositionAction = definition.Disposition_Action__c;
            item.recoveryWindowDays = Integer.valueOf(definition.Recovery_Window_Days__c);
            item.controlOwner = definition.Control_Owner__c;
            item.approvalStatus = definition.Approval_Status__c;
            item.evidenceReference = definition.Evidence_Reference__c;
            result.add(item);
        }
        return result;
    }

    public static SourceContract requireInboundContract(String entityType, String contractVersion) {
        if (String.isBlank(entityType)) fail('entityType is required.');
        for (SourceContract contract : sourceContracts()) {
            if (contract.entity != null && contract.entity.equalsIgnoreCase(entityType) && contract.direction == 'Inbound') {
                if (String.isBlank(contractVersion)) fail('contractVersion is required. Use ' + contract.contractVersion + '.');
                if (contractVersion != contract.contractVersion) fail('Unsupported contractVersion ' + contractVersion + ' for ' + entityType + '; use ' + contract.contractVersion + '.');
                return contract;
            }
        }
        fail('No active inbound source contract exists for ' + entityType + '.');
        return null;
    }

    public static String currentContractVersion() {
        List<SourceContract> contracts = sourceContracts();
        return contracts.isEmpty() ? 'R360-MOCK-1.2' : contracts[0].contractVersion;
    }

    private static Boolean allSourcesApproved(List<SourceContract> records) { for (SourceContract record : records) if (record.approvalStatus != 'Approved mock assumption' || record.approvedOn == null) return false; return !records.isEmpty(); }
    private static Boolean allPersonasApproved(List<PersonaMapping> records) { for (PersonaMapping record : records) if (record.approvalStatus != 'Approved mock assumption') return false; return !records.isEmpty(); }
    private static Boolean allRetentionApproved(List<RetentionRule> records) { for (RetentionRule record : records) if (record.approvalStatus != 'Approved mock assumption') return false; return !records.isEmpty(); }
    private static void fail(String message) { throw new AuraHandledException(message); }
}
