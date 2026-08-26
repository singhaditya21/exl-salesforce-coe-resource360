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
        System.assertEquals(8, [
            SELECT COUNT() FROM User
            WHERE FederationIdentifier LIKE 'R360-DEMO-%'
                AND UserPreferencesLightningExperiencePreferred=true
        ]);
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
        System.assertEquals(17, [
            SELECT COUNT() FROM R360_Role_Scope__c
            WHERE User__r.FederationIdentifier LIKE 'R360-DEMO-%' AND Active__c=true
                AND Portfolio_ID__c='PORT-SFCOE-DEMO'
        ]);
        System.assertEquals(0, [
            SELECT COUNT() FROM R360_Role_Scope__c
            WHERE User__c=:UserInfo.getUserId() AND Active__c=true AND Business_Role__c!='Administrator'
        ]);
        System.assertEquals(3, [
            SELECT COUNT() FROM Resource__c
            WHERE Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830') AND Salesforce_User__c != null
        ]);

        Map<String, Id> userIds = new Map<String, Id>();
        for (User demoUser : [SELECT Id, FederationIdentifier FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%']) {
            userIds.put(demoUser.FederationIdentifier, demoUser.Id);
        }
        Integer engagementCount = [SELECT COUNT() FROM Engagement__c];
        Integer staffingCount = [SELECT COUNT() FROM Staffing_Request__c];
        Integer allocationCount = [SELECT COUNT() FROM Allocation__c];
        Integer budgetCount = [SELECT COUNT() FROM Budget__c];
        Integer approvalCount = [SELECT COUNT() FROM R360_Approval_Decision__c];
        Integer commercialCount = [SELECT COUNT() FROM Commercial_Reference__c];
        Integer portfolioCount = [SELECT COUNT() FROM R360_Portfolio__c WHERE Portfolio_ID__c='PORT-SFCOE-DEMO'];

        for (Id demoUserId : userIds.values()) {
            System.assertEquals(portfolioCount, shareCount('R360_Portfolio__c', demoUserId), 'Every demo identity must receive its explicitly scoped portfolio record.');
            System.assertEquals(engagementCount, shareCount('Engagement__c', demoUserId), 'Every demo identity must receive its complete portfolio.');
        }
        for (String federationId : new List<String>{'R360-DEMO-PROJECT','R360-DEMO-STAFFER','R360-DEMO-PRACTITIONER'}) {
            System.assertEquals(staffingCount, shareCount('Staffing_Request__c', userIds.get(federationId)), federationId+' must receive the staffing queue.');
            System.assertEquals(allocationCount, shareCount('Allocation__c', userIds.get(federationId)), federationId+' must receive current allocations.');
        }
        for (String federationId : new List<String>{'R360-DEMO-PROJECT','R360-DEMO-CAPABILITY','R360-DEMO-CONFIGMAKER','R360-DEMO-CHECKER','R360-DEMO-APPROVER','R360-DEMO-PRACTITIONER'}) {
            System.assertEquals(budgetCount, shareCount('Budget__c', userIds.get(federationId)), federationId+' must receive scoped budgets.');
        }
        for (String federationId : new List<String>{'R360-DEMO-STAFFER','R360-DEMO-CAPABILITY','R360-DEMO-CONFIGMAKER','R360-DEMO-CHECKER','R360-DEMO-APPROVER','R360-DEMO-PRACTITIONER','R360-DEMO-PROJECT'}) {
            System.assertEquals(commercialCount, shareCount('Commercial_Reference__c', userIds.get(federationId)), federationId+' must receive commercial reference evidence.');
        }
        System.assertEquals(0, shareCount('Commercial_Reference__c', userIds.get('R360-DEMO-MANAGER')), 'The Reporting Manager must not receive commercial data.');
        for (String federationId : new List<String>{'R360-DEMO-STAFFER','R360-DEMO-APPROVER','R360-DEMO-PRACTITIONER'}) {
            System.assertEquals(approvalCount, shareCount('R360_Approval_Decision__c', userIds.get(federationId)), federationId+' must receive approval evidence for its control role.');
        }
        Id practitionerUserId = userIds.get('R360-DEMO-PRACTITIONER');
        Set<Id> practitionerResourceIds = new Map<Id, Resource__c>([
            SELECT Id FROM Resource__c WHERE Salesforce_User__c=:practitionerUserId
        ]).keySet();
        System.assertEquals(1, practitionerResourceIds.size(), 'The fictional practitioner must map to one Salesforce resource identity.');
        System.assertEquals([SELECT COUNT() FROM Skill_Claim__c WHERE Resource__c IN :practitionerResourceIds], shareCount('Skill_Claim__c', practitionerUserId));
        System.assertEquals([SELECT COUNT() FROM Credential__c WHERE Resource__c IN :practitionerResourceIds], shareCount('Credential__c', practitionerUserId));
        System.assertEquals([SELECT COUNT() FROM R360_Project_Evidence__c WHERE Resource__c IN :practitionerResourceIds], shareCount('R360_Project_Evidence__c', practitionerUserId));
        System.assertEquals([SELECT COUNT() FROM R360_Learning_Achievement__c WHERE Resource__c IN :practitionerResourceIds], shareCount('R360_Learning_Achievement__c', practitionerUserId));
        System.assertEquals([SELECT COUNT() FROM Timesheet__c WHERE Resource__c IN :practitionerResourceIds], shareCount('Timesheet__c', practitionerUserId));
    }

    private static Integer shareCount(String objectName, Id userId) {
        return Database.countQuery(
            'SELECT COUNT() FROM '+objectName.replace('__c', '__Share')+
            ' WHERE UserOrGroupId=\''+String.escapeSingleQuotes(String.valueOf(userId))+'\' AND RowCause=\'Resource360_Scope__c\''
        );
    }
}
