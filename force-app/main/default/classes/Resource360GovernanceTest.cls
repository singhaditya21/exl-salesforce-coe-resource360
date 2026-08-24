@IsTest
private class Resource360GovernanceTest {
    @TestSetup
    static void setupData(){Resource360DemoData.seed();}

    @IsTest
    static void metadataContractsAndPersonaMappingsAreComplete(){
        List<Resource360GovernanceService.SourceContract> sources=Resource360GovernanceService.sourceContracts();
        List<Resource360GovernanceService.PersonaMapping> personas=Resource360GovernanceService.personaMappings();
        List<Resource360GovernanceService.RetentionRule> retention=Resource360GovernanceService.retentionRules();
        System.assertEquals(13,sources.size());System.assertEquals(18,personas.size());System.assertEquals(8,retention.size());
        Set<String>entities=new Set<String>();for(Resource360GovernanceService.SourceContract source:sources){entities.add(source.entity);System.assertEquals('Approved mock assumption',source.approvalStatus);System.assertNotEquals(null,source.identity);System.assertNotEquals(null,source.owner);}
        for(String required:new List<String>{'Employee','Engagement','CommercialReference','Capability','SkillClaim','Budget','Allocation','ApprovedTime','Identity'})System.assert(entities.contains(required),'Missing lineage contract for '+required);
        Set<String>groups=new Set<String>();for(PermissionSetGroup permissionGroup:[SELECT DeveloperName FROM PermissionSetGroup])groups.add(permissionGroup.DeveloperName);
        for(Resource360GovernanceService.PersonaMapping persona:personas){System.assertEquals('Approved mock assumption',persona.approvalStatus);System.assertNotEquals(null,persona.entraGroupAlias);if(persona.businessRole!='Administrator')System.assert(groups.contains(persona.permissionSetGroup),'Missing permission-set group '+persona.permissionSetGroup);}
        Map<String,Object>snapshot=(Map<String,Object>)JSON.deserializeUntyped(Resource360GovernanceService.governanceSnapshot());System.assertEquals(true,snapshot.get('sourceContractsApproved'));System.assertEquals(true,snapshot.get('personaMappingsApproved'));System.assertEquals(true,snapshot.get('retentionRulesApproved'));
    }

    @IsTest
    static void inboundContractVersionFailsClosed(){
        RestRequest request=new RestRequest();request.requestUri='/services/apexrest/resource360/v1/master-data/employees';request.httpMethod='POST';request.requestBody=Blob.valueOf(JSON.serialize(new Map<String,Object>{'runId'=>'BAD-CONTRACT-VERSION','sourceSystem'=>'Mock EXL People Master','entityType'=>'Employee','contractVersion'=>'R360-MOCK-0.1','records'=>new List<Object>()}));RestContext.request=request;RestContext.response=new RestResponse();
        Boolean blocked=false;try{Resource360InboundApi.ingest();}catch(AuraHandledException expected){blocked=true;}System.assert(blocked,'Unknown source contract versions must fail before a run is created.');System.assertEquals(0,[SELECT COUNT() FROM R360_Integration_Run__c WHERE Run_ID__c='BAD-CONTRACT-VERSION']);
    }

    @IsTest
    static void roleScopesValidateDelegateCertifyAndRevoke(){
        Profile profile=[SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];User delegate=new User(Alias='r360del',Email='r360.delegate@example.invalid',EmailEncodingKey='UTF-8',LastName='Delegate',LanguageLocaleKey='en_US',LocaleSidKey='en_US',ProfileId=profile.Id,TimeZoneSidKey='Asia/Kolkata',Username='r360.delegate.'+System.now().getTime()+'@example.invalid');insert delegate;
        Boolean unknownBlocked=false;try{insert new R360_Role_Scope__c(Scope_Key__c='BAD-ROLE',User__c=delegate.Id,Business_Role__c='Invented Role',Valid_From__c=Date.today(),Active__c=true);}catch(DmlException expected){unknownBlocked=true;}System.assert(unknownBlocked,'Unmapped personas must fail closed.');
        Boolean selfBlocked=false;try{insert new R360_Role_Scope__c(Scope_Key__c='BAD-SELF',User__c=UserInfo.getUserId(),Business_Role__c='Project Manager',Valid_From__c=Date.today(),Active__c=true,Assignment_Source__c='Delegated',Delegated_By__c=UserInfo.getUserId(),Delegation_Reason__c='Invalid self delegation');}catch(DmlException expected){selfBlocked=true;}System.assert(selfBlocked,'Self delegation must be rejected.');
        Test.startTest();Resource360Service.ServiceResult delegated=Resource360RoleScopeService.delegateRole(delegate.Id,'Project Manager','ORG-SFCOE','PORT-SF',Date.today(),Date.today().addDays(10),'Approved mock leave cover.');Test.stopTest();R360_Role_Scope__c scope=[SELECT Id,Assignment_Source__c,Delegated_By__c,Delegation_Reason__c,Active__c FROM R360_Role_Scope__c WHERE Id=:delegated.recordId];System.assertEquals('Delegated',scope.Assignment_Source__c);System.assertEquals(UserInfo.getUserId(),scope.Delegated_By__c);System.assert(scope.Active__c);
        Resource360RoleScopeService.certifyScope(scope.Id,'MOCK-ACCESS-REVIEW-2026-08-24');scope=[SELECT Last_Certified_At__c,Certified_By__c,Approval_Reference__c FROM R360_Role_Scope__c WHERE Id=:scope.Id];System.assertNotEquals(null,scope.Last_Certified_At__c);System.assertEquals('MOCK-ACCESS-REVIEW-2026-08-24',scope.Approval_Reference__c);
        Resource360RoleScopeService.revokeScope(scope.Id,'Delegation window ended early.');scope=[SELECT Active__c,Revoked_At__c,Revoked_By__c FROM R360_Role_Scope__c WHERE Id=:scope.Id];System.assertEquals(false,scope.Active__c);System.assertNotEquals(null,scope.Revoked_At__c);System.assertEquals(UserInfo.getUserId(),scope.Revoked_By__c);
    }
}
