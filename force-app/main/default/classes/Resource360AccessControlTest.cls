@IsTest
private class Resource360AccessControlTest {
    @TestSetup
    static void setupData() { Resource360DemoData.seed(); }

    @IsTest
    static void positiveNegativeExpiredAndMultiRoleScopesAreEnforced() {
        Profile standardProfile = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];
        User user = testUser(standardProfile.Id, 'scope');
        insert user;
        insert new PermissionSetAssignment(
            AssigneeId=user.Id,
            PermissionSetId=[SELECT Id FROM PermissionSet WHERE Name='Resource360_Base_User' LIMIT 1].Id
        );

        Date userToday;
        System.runAs(user) {
            userToday = Date.today();
        }

        System.runAs(new User(Id=UserInfo.getUserId())) {
            insert new List<R360_Role_Scope__c>{
                scope(user.Id, 'ACTIVE-PM', 'Project Manager', userToday.addDays(-5), userToday.addDays(30), true),
                scope(user.Id, 'ACTIVE-MANAGER', 'Reporting Manager', userToday.addDays(-5), userToday.addDays(30), true),
                scope(user.Id, 'EXPIRED-STAFFER', 'COE Staffer', userToday.addDays(-30), userToday.addDays(-1), true),
                scope(user.Id, 'FUTURE-FINANCE', 'Finance/PMO', userToday.addDays(1), userToday.addDays(30), true)
            };
        }
        System.runAs(user) {
            Set<String> active = Resource360Security.activeRoles();
            System.assertEquals(new Set<String>{'Project Manager','Reporting Manager'}, active);
            Boolean bulkBlocked = false;
            try { Resource360BulkService.preview('Employee', '[]'); }
            catch (AuraHandledException expected) { bulkBlocked = true; }
            System.assert(bulkBlocked, 'A base user must not inherit Operations bulk authority from a business-role label.');
        }
    }

    @IsTest
    static void entraMismatchNonDelegablePersonaAndRevocationMutationFailClosed() {
        Profile standardProfile = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];
        User user = testUser(standardProfile.Id, 'guard');
        insert user;

        R360_Role_Scope__c mismatched = scope(user.Id, 'BAD-ENTRA', 'Project Manager', Date.today(), Date.today().addDays(30), true);
        mismatched.Assignment_Source__c = 'Entra Group';
        mismatched.External_Group_Alias__c = 'EXL-R360-Wrong-Group';
        Boolean entraBlocked = false;
        try { insert mismatched; } catch (DmlException expected) { entraBlocked = true; }
        System.assert(entraBlocked, 'An Entra assignment must match the active persona mapping exactly.');

        Boolean delegationBlocked = false;
        try { Resource360RoleScopeService.delegateRole(user.Id, 'Configuration Operator', 'ORG-SFCOE', null, Date.today(), Date.today().addDays(5), 'Invalid non-delegable maker authority.'); }
        catch (DmlException expected) { delegationBlocked = true; }
        System.assert(delegationBlocked, 'A non-delegable persona must fail in the trigger even for an administrator.');

        R360_Role_Scope__c revoked = scope(user.Id, 'REVOKED-AUDIT', 'Auditor', Date.today().addDays(-10), Date.today().addDays(10), false);
        revoked.Revoked_At__c = System.now();
        revoked.Revoked_By__c = UserInfo.getUserId();
        revoked.Delegation_Reason__c = 'Approved mock revocation evidence.';
        insert revoked;
        revoked.Active__c = true;
        Boolean immutable = false;
        try { update revoked; } catch (DmlException expected) { immutable = true; }
        System.assert(immutable, 'Revocation evidence and state must be immutable.');
    }

    @IsTest
    static void everyPersonaHonorsActiveMultiRoleAndExpiredScopeBoundaries() {
        Profile standardProfile = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1];
        User multiRoleUser = testUser(standardProfile.Id, 'allroles');
        User expiredUser = testUser(standardProfile.Id, 'expired');
        insert new List<User>{multiRoleUser, expiredUser};
        Id basePermissionSetId = [SELECT Id FROM PermissionSet WHERE Name='Resource360_Base_User' LIMIT 1].Id;
        insert new List<PermissionSetAssignment>{
            new PermissionSetAssignment(AssigneeId=multiRoleUser.Id, PermissionSetId=basePermissionSetId),
            new PermissionSetAssignment(AssigneeId=expiredUser.Id, PermissionSetId=basePermissionSetId)
        };

        List<R360_Role_Scope__c> scopes = new List<R360_Role_Scope__c>();
        Set<String> expectedRoles = new Set<String>();
        Integer sequence = 0;
        for (R360_Persona__mdt persona : [SELECT Business_Role__c FROM R360_Persona__mdt WHERE Active__c=true ORDER BY Business_Role__c]) {
            sequence++;
            expectedRoles.add(persona.Business_Role__c);
            scopes.add(scope(multiRoleUser.Id, 'ALL-ACTIVE-'+sequence, persona.Business_Role__c, Date.today().addDays(-1), Date.today().addDays(1), true));
            scopes.add(scope(expiredUser.Id, 'ALL-EXPIRED-'+sequence, persona.Business_Role__c, Date.today().addDays(-10), Date.today().addDays(-1), true));
        }
        System.assertEquals(18, expectedRoles.size(), 'Every governed persona must participate in the boundary test.');
        System.runAs(new User(Id=UserInfo.getUserId())) {
            insert scopes;
        }
        System.runAs(multiRoleUser) {
            System.assertEquals(expectedRoles, Resource360Security.activeRoles(), 'All effective multi-role personas must be returned exactly once.');
        }
        System.runAs(expiredUser) {
            System.assertEquals(new Set<String>(), Resource360Security.activeRoles(), 'Every expired persona scope must fail closed.');
        }
    }

    private static R360_Role_Scope__c scope(Id userId, String key, String role, Date fromDate, Date toDate, Boolean active) {
        return new R360_Role_Scope__c(
            Scope_Key__c=key, User__c=userId, Business_Role__c=role,
            Org_Unit_ID__c='ORG-SFCOE', Portfolio_ID__c='PORT-SF',
            Valid_From__c=fromDate, Valid_To__c=toDate, Active__c=active,
            Assignment_Source__c='Manual approved mock', Approval_Reference__c='R360-ACCESS-TEST'
        );
    }

    private static User testUser(Id profileId, String suffix) {
        String unique = suffix + String.valueOf(System.now().getTime());
        String alias = 'r' + suffix;
        if (alias.length() > 8) alias = alias.substring(0, 8);
        return new User(Alias=alias, Email='r360.'+unique+'@example.invalid', EmailEncodingKey='UTF-8', LastName='Resource360 '+suffix, LanguageLocaleKey='en_US', LocaleSidKey='en_US', ProfileId=profileId, TimeZoneSidKey='Asia/Kolkata', Username='r360.'+unique+'@example.invalid');
    }
}
