public inherited sharing class Resource360RoleScopeService {
    @TestVisible public static Boolean suppressSharingRebuild = false;

    public static void validate(List<R360_Role_Scope__c> records, Map<Id,R360_Role_Scope__c> oldMap) {
        Map<String,R360_Persona__mdt> personas = new Map<String,R360_Persona__mdt>();
        for (R360_Persona__mdt persona : [SELECT Business_Role__c, Entra_Group_Alias__c, Delegation_Allowed__c FROM R360_Persona__mdt WHERE Active__c=true]) personas.put(persona.Business_Role__c, persona);
        for (R360_Role_Scope__c record : records) {
            if (record.User__c == null) record.addError('A role scope requires a Salesforce user.');
            if (!personas.containsKey(record.Business_Role__c)) record.addError('Business role must be an active Resource 360 persona.');
            if (record.Valid_From__c == null) record.addError('Valid From is required.');
            if (record.Valid_To__c != null && record.Valid_From__c != null && record.Valid_To__c < record.Valid_From__c) record.addError('Valid To cannot precede Valid From.');
            if (String.isBlank(record.Assignment_Source__c)) record.Assignment_Source__c = record.Delegated_By__c == null ? 'Manual approved mock' : 'Delegated';
            if (!new Set<String>{'Manual approved mock','Entra Group','Delegated','Migration'}.contains(record.Assignment_Source__c)) record.addError('Assignment Source must be Manual approved mock, Entra Group, Delegated or Migration.');
            R360_Persona__mdt persona = personas.get(record.Business_Role__c);
            if (record.Assignment_Source__c == 'Entra Group') {
                if (String.isBlank(record.External_Group_Alias__c)) record.addError('An Entra Group assignment requires its governed group alias.');
                else if (persona != null && record.External_Group_Alias__c != persona.Entra_Group_Alias__c) record.addError('External group alias does not match the active persona mapping.');
            }
            if (record.Delegated_By__c != null || record.Assignment_Source__c == 'Delegated') {
                if (record.Delegated_By__c == null) record.addError('A delegated scope requires the delegating user.');
                if (record.Delegated_By__c == record.User__c) record.addError('A user cannot delegate a role to themselves.');
                if (String.isBlank(record.Delegation_Reason__c)) record.addError('A delegated scope requires an attributable reason.');
                if (persona != null && persona.Delegation_Allowed__c != true) record.addError('The selected persona does not permit delegation.');
            }
            if (record.Revoked_At__c != null && record.Active__c == true) record.addError('A revoked scope cannot remain active.');
            if (record.Revoked_At__c != null && record.Revoked_By__c == null) record.addError('Revocation requires an attributable user.');
            if (oldMap != null && oldMap.containsKey(record.Id)) {
                R360_Role_Scope__c prior = oldMap.get(record.Id);
                if (prior.Revoked_At__c != null && (record.Revoked_At__c != prior.Revoked_At__c || record.Revoked_By__c != prior.Revoked_By__c || record.Active__c != prior.Active__c)) record.addError('Revocation evidence is immutable.');
            }
        }
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult delegateRole(Id delegateUserId, String businessRole, String orgUnitId, String portfolioId, Date validFrom, Date validTo, String reason) {
        if (delegateUserId == null || String.isBlank(businessRole) || String.isBlank(reason)) fail('Delegate, business role and reason are required.');
        if (!Resource360Security.activeRoles().contains(businessRole) && !Resource360Security.activeRoles().contains('Administrator')) fail('The delegator must currently hold the delegated business role.');
        String correlation = correlationId();
        R360_Role_Scope__c scope = new R360_Role_Scope__c(
            Scope_Key__c='DELEGATED-'+correlation.substring(0,24), User__c=delegateUserId, Business_Role__c=businessRole,
            Org_Unit_ID__c=orgUnitId, Portfolio_ID__c=portfolioId, Valid_From__c=validFrom==null?Date.today():validFrom,
            Valid_To__c=validTo, Active__c=true, Delegated_By__c=UserInfo.getUserId(), Delegation_Reason__c=reason,
            Assignment_Source__c='Delegated', Approval_Reference__c='Delegation '+correlation
        );
        insert scope;
        Resource360AuditService.record(correlation,businessRole,'ROLE_SCOPE_DELEGATED','R360_Role_Scope__c',scope.Id,1,'EFFECTIVE_DATED_DELEGATION',reason,null,new Map<String,Object>{'delegateUserId'=>delegateUserId,'businessRole'=>businessRole,'validFrom'=>scope.Valid_From__c,'validTo'=>scope.Valid_To__c,'orgUnitId'=>orgUnitId,'portfolioId'=>portfolioId});
        return new Resource360Service.ServiceResult(true,'Effective-dated role delegation created.',scope.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult certifyScope(Id scopeId, String approvalReference) {
        Resource360Security.requirePermission('Resource360_Manage_Integrations','Operations permission is required to certify access mappings.');
        if (scopeId == null || String.isBlank(approvalReference)) fail('Scope and approval reference are required.');
        R360_Role_Scope__c scope=[SELECT Id,Active__c FROM R360_Role_Scope__c WHERE Id=:scopeId WITH USER_MODE LIMIT 1 FOR UPDATE];
        scope.Last_Certified_At__c=System.now();scope.Certified_By__c=UserInfo.getUserId();scope.Approval_Reference__c=approvalReference;update scope;
        String correlation=correlationId();Resource360AuditService.record(correlation,'Operations','ROLE_SCOPE_CERTIFIED','R360_Role_Scope__c',scope.Id,1,'ACCESS_REVIEW',approvalReference,null,new Map<String,Object>{'certifiedAt'=>scope.Last_Certified_At__c});
        return new Resource360Service.ServiceResult(true,'Role scope certification recorded.',scope.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult revokeScope(Id scopeId, String reason) {
        Resource360Security.requirePermission('Resource360_Manage_Integrations','Operations permission is required to revoke access mappings.');
        if (scopeId == null || String.isBlank(reason)) fail('Scope and revocation reason are required.');
        R360_Role_Scope__c scope=[SELECT Id,Active__c,Revoked_At__c FROM R360_Role_Scope__c WHERE Id=:scopeId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(scope.Revoked_At__c!=null)return new Resource360Service.ServiceResult(true,'Role scope was already revoked.',scope.Id,correlationId());
        scope.Active__c=false;scope.Revoked_At__c=System.now();scope.Revoked_By__c=UserInfo.getUserId();scope.Delegation_Reason__c=reason;update scope;
        String correlation=correlationId();Resource360AuditService.record(correlation,'Operations','ROLE_SCOPE_REVOKED','R360_Role_Scope__c',scope.Id,1,'ACCESS_REMOVED',reason,null,new Map<String,Object>{'revokedAt'=>scope.Revoked_At__c});
        return new Resource360Service.ServiceResult(true,'Role scope revoked and sharing recalculation queued.',scope.Id,correlation);
    }

    private static String correlationId(){return EncodingUtil.convertToHex(Crypto.generateAesKey(128));}
    private static void fail(String message){throw new AuraHandledException(message);}
}
