@IsTest
private class Resource360DemoProvisionerTest {
    @TestSetup
    static void setupData() {
        Resource360DemoData.seed();
    }

    @IsTest
    static void provisionsEveryBusinessPersonaAcrossRealPermissionGroupsAndUsers() {
        List<Id> groupIds = new List<Id>();
        for (PermissionSetGroup groupRecord : [
            SELECT Id FROM PermissionSetGroup WHERE DeveloperName LIKE 'Resource360_%'
        ]) {
            groupIds.add(groupRecord.Id);
        }
        Test.calculatePermissionSetGroup(groupIds);

        Test.startTest();
        Resource360DemoProvisioner.ProvisioningResult first = Resource360DemoProvisioner.provision();
        Test.stopTest();

        System.assert(first.success);
        System.assertEquals(8, first.userCount);
        System.assertEquals(17, [
            SELECT COUNT() FROM PermissionSetAssignment
            WHERE Assignee.FederationIdentifier LIKE 'R360-DEMO-%' AND PermissionSetGroupId != null
        ]);
        System.assertEquals(17, [
            SELECT COUNT() FROM R360_Role_Scope__c
            WHERE User__r.FederationIdentifier LIKE 'R360-DEMO-%' AND Active__c=true
                AND Assignment_Source__c='Manual approved mock'
                AND Approval_Reference__c='R360-MOCK-PERSONA-PROVISIONING'
                AND Last_Certified_At__c != null
        ]);
        System.assertEquals(0, [
            SELECT COUNT() FROM R360_Role_Scope__c
            WHERE User__c=:UserInfo.getUserId() AND Active__c=true AND Business_Role__c!='Administrator'
        ]);
        System.assertEquals(3, [
            SELECT COUNT() FROM Resource__c
            WHERE Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830') AND Salesforce_User__c != null
        ]);
    }
}
