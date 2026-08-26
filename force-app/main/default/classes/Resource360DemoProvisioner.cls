/**
 * Provisions the permanent demo org with fictional, least-privilege identities.
 * User and permission-set-group changes are setup-object DML; governed role
 * scopes are created in the queued transaction to avoid mixed DML.
 */
public without sharing class Resource360DemoProvisioner {
    private static final String DEMO_PORTFOLIO_ID = 'PORT-SFCOE-DEMO';
    @TestVisible private static Boolean bypassGroupRecalculationWait = false;

    public class ProvisioningResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public Integer userCount;
        @AuraEnabled public Integer assignmentCount;
        @AuraEnabled public Id scopeJobId;

        public ProvisioningResult(Boolean success, String message, Integer userCount, Integer assignmentCount, Id scopeJobId) {
            this.success = success;
            this.message = message;
            this.userCount = userCount;
            this.assignmentCount = assignmentCount;
            this.scopeJobId = scopeJobId;
        }
    }

    private class PersonaPlan {
        String key;
        String label;
        String alias;
        Boolean platformLicense;
        List<String> roles;

        PersonaPlan(String key, String label, String alias, Boolean platformLicense, List<String> roles) {
            this.key = key;
            this.label = label;
            this.alias = alias;
            this.platformLicense = platformLicense;
            this.roles = roles;
        }
    }

    @AuraEnabled
    public static ProvisioningResult provision() {
        if (![SELECT PermissionsModifyAllData FROM Profile WHERE Id=:UserInfo.getProfileId()].PermissionsModifyAllData) {
            throw new AuraHandledException('Resource 360 demo-user provisioning requires a System Administrator.');
        }

        List<PersonaPlan> plans = plans();
        Map<String, R360_Persona__mdt> personaByRole = new Map<String, R360_Persona__mdt>();
        for (R360_Persona__mdt persona : [
            SELECT Business_Role__c, Permission_Set_Group__c
            FROM R360_Persona__mdt
            WHERE Active__c=true AND Business_Role__c!='Administrator'
        ]) {
            personaByRole.put(persona.Business_Role__c, persona);
        }

        Set<String> plannedRoles = new Set<String>();
        for (PersonaPlan plan : plans) plannedRoles.addAll(plan.roles);
        if (plannedRoles != personaByRole.keySet()) {
            throw new AuraHandledException('The demo-user plan must cover every active non-administrator persona exactly once.');
        }

        Map<String, Profile> profiles = new Map<String, Profile>();
        for (Profile profile : [
            SELECT Id, Name FROM Profile
            WHERE Name IN ('Standard Platform User', 'Minimum Access - Salesforce')
        ]) {
            profiles.put(profile.Name, profile);
        }
        if (!profiles.containsKey('Standard Platform User') || !profiles.containsKey('Minimum Access - Salesforce')) {
            throw new AuraHandledException('Required minimum-access Salesforce profiles are unavailable.');
        }

        Map<String, User> usersByFederationId = new Map<String, User>();
        for (User existing : [
            SELECT Id, FederationIdentifier, IsActive, ProfileId, LastName, TimeZoneSidKey,
                UserPreferencesLightningExperiencePreferred
            FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%'
        ]) {
            usersByFederationId.put(existing.FederationIdentifier, existing);
        }

        Id orgId = UserInfo.getOrganizationId();
        List<User> usersToInsert = new List<User>();
        List<User> usersToUpdate = new List<User>();
        for (PersonaPlan plan : plans) {
            String federationId = federationId(plan.key);
            Id profileId = profiles.get(plan.platformLicense ? 'Standard Platform User' : 'Minimum Access - Salesforce').Id;
            User existing = usersByFederationId.get(federationId);
            if (existing == null) {
                usersToInsert.add(new User(
                    Alias=plan.alias,
                    Email='resource360.'+plan.key+'@example.invalid',
                    EmailEncodingKey='UTF-8',
                    FederationIdentifier=federationId,
                    LanguageLocaleKey='en_US',
                    LastName='R360 '+plan.label,
                    LocaleSidKey='en_IN',
                    ProfileId=profileId,
                    TimeZoneSidKey='Asia/Kolkata',
                    UserPreferencesLightningExperiencePreferred=true,
                    UserPermissionsSFContentUser=false,
                    Username='resource360.'+plan.key+'.'+String.valueOf(orgId).toLowerCase()+'@example.invalid'
                ));
            } else if (!existing.IsActive || existing.ProfileId != profileId || existing.LastName != 'R360 '+plan.label || existing.TimeZoneSidKey != 'Asia/Kolkata' || !existing.UserPreferencesLightningExperiencePreferred) {
                existing.IsActive = true;
                existing.ProfileId = profileId;
                existing.LastName = 'R360 '+plan.label;
                existing.TimeZoneSidKey = 'Asia/Kolkata';
                existing.UserPreferencesLightningExperiencePreferred = true;
                usersToUpdate.add(existing);
            }
        }
        if (!usersToInsert.isEmpty()) insert usersToInsert;
        if (!usersToUpdate.isEmpty()) update usersToUpdate;

        usersByFederationId.clear();
        for (User demoUser : [SELECT Id, FederationIdentifier FROM User WHERE FederationIdentifier LIKE 'R360-DEMO-%' AND IsActive=true]) {
            usersByFederationId.put(demoUser.FederationIdentifier, demoUser);
        }
        if (usersByFederationId.size() != plans.size()) {
            throw new AuraHandledException('All eight Resource 360 demo identities must be active before access is assigned.');
        }

        Set<String> requiredGroups = new Set<String>();
        for (R360_Persona__mdt persona : personaByRole.values()) requiredGroups.add(persona.Permission_Set_Group__c);
        Map<String, PermissionSetGroup> groupByName = new Map<String, PermissionSetGroup>();
        for (PermissionSetGroup groupRecord : [
            SELECT Id, DeveloperName, Status FROM PermissionSetGroup WHERE DeveloperName IN :requiredGroups
        ]) {
            // Check-only deployments can leave a changed group in Updating while
            // Apex tests run. Tests do not exercise permissions through these
            // assignments; production provisioning must still fail closed.
            if (groupRecord.Status != 'Updated' && !(Test.isRunningTest() && bypassGroupRecalculationWait)) {
                throw new AuraHandledException('Permission-set group '+groupRecord.DeveloperName+' is still recalculating.');
            }
            groupByName.put(groupRecord.DeveloperName, groupRecord);
        }
        if (groupByName.size() != requiredGroups.size()) {
            throw new AuraHandledException('One or more governed Resource 360 permission-set groups are missing.');
        }

        Map<Id, Set<Id>> expectedGroupIdsByUser = new Map<Id, Set<Id>>();
        Map<String, List<String>> rolesByFederationId = new Map<String, List<String>>();
        for (PersonaPlan plan : plans) {
            String federationId = federationId(plan.key);
            Id userId = usersByFederationId.get(federationId).Id;
            expectedGroupIdsByUser.put(userId, new Set<Id>());
            rolesByFederationId.put(federationId, plan.roles);
            for (String role : plan.roles) {
                expectedGroupIdsByUser.get(userId).add(groupByName.get(personaByRole.get(role).Permission_Set_Group__c).Id);
            }
        }

        Set<Id> demoUserIds = expectedGroupIdsByUser.keySet();
        Map<String, PermissionSetAssignment> existingAssignments = new Map<String, PermissionSetAssignment>();
        for (PermissionSetAssignment assignment : [
            SELECT Id, AssigneeId, PermissionSetGroupId
            FROM PermissionSetAssignment
            WHERE AssigneeId IN :demoUserIds AND PermissionSetGroupId != null
        ]) {
            existingAssignments.put(String.valueOf(assignment.AssigneeId)+'-'+String.valueOf(assignment.PermissionSetGroupId), assignment);
        }

        List<PermissionSetAssignment> assignmentsToInsert = new List<PermissionSetAssignment>();
        for (Id userId : expectedGroupIdsByUser.keySet()) {
            for (Id groupId : expectedGroupIdsByUser.get(userId)) {
                String assignmentKey = String.valueOf(userId)+'-'+String.valueOf(groupId);
                if (!existingAssignments.containsKey(assignmentKey)) {
                    assignmentsToInsert.add(new PermissionSetAssignment(AssigneeId=userId, PermissionSetGroupId=groupId));
                }
            }
        }
        if (!assignmentsToInsert.isEmpty()) insert assignmentsToInsert;

        AsyncOptions scopeOptions = new AsyncOptions();
        scopeOptions.MaximumQueueableStackDepth = 12;
        Id scopeJobId = System.enqueueJob(new PersonaScopeJob(rolesByFederationId, UserInfo.getUserId()), scopeOptions);
        return new ProvisioningResult(
            true,
            'Eight fictional demo identities and all 17 governed business-persona assignments are provisioned; scope certification is queued.',
            usersByFederationId.size(),
            assignmentsToInsert.size(),
            scopeJobId
        );
    }

    public class PersonaScopeJob implements Queueable {
        private Map<String, List<String>> rolesByFederationId;
        private Id administratorId;

        public PersonaScopeJob(Map<String, List<String>> rolesByFederationId, Id administratorId) {
            this.rolesByFederationId = rolesByFederationId;
            this.administratorId = administratorId;
        }

        public void execute(QueueableContext context) {
            Map<String, User> usersByFederationId = new Map<String, User>();
            for (User demoUser : [SELECT Id, FederationIdentifier FROM User WHERE FederationIdentifier IN :rolesByFederationId.keySet() AND IsActive=true]) {
                usersByFederationId.put(demoUser.FederationIdentifier, demoUser);
            }

            Datetime certifiedAt = System.now();
            Date validFrom = Date.today().addDays(-1);
            List<R360_Role_Scope__c> changes = new List<R360_Role_Scope__c>();
            for (String federationId : rolesByFederationId.keySet()) {
                User demoUser = usersByFederationId.get(federationId);
                if (demoUser == null) continue;
                for (String role : rolesByFederationId.get(federationId)) {
                    changes.add(new R360_Role_Scope__c(
                        Scope_Key__c='DEMO-PERSONA-'+federationId.replace('R360-DEMO-', '')+'-'+slug(role),
                        User__c=demoUser.Id,
                        Business_Role__c=role,
                        Org_Unit_ID__c='ORG-SFCOE',
                        Portfolio_ID__c=DEMO_PORTFOLIO_ID,
                        Valid_From__c=validFrom,
                        Active__c=true,
                        Assignment_Source__c='Manual approved mock',
                        Approval_Reference__c='R360-MOCK-PERSONA-PROVISIONING',
                        Last_Certified_At__c=certifiedAt,
                        Certified_By__c=administratorId
                    ));
                }
            }

            for (R360_Role_Scope__c adminScope : [
                SELECT Id, Scope_Key__c, Assignment_Source__c, Approval_Reference__c, Last_Certified_At__c
                FROM R360_Role_Scope__c
                WHERE User__c=:administratorId AND Active__c=true AND Business_Role__c!='Administrator'
            ]) {
                adminScope.Active__c = false;
                adminScope.Revoked_At__c = certifiedAt;
                adminScope.Revoked_By__c = administratorId;
                adminScope.Delegation_Reason__c = 'Replaced by certified fictional persona users for the Salesforce demo.';
                if (String.isBlank(adminScope.Assignment_Source__c)) adminScope.Assignment_Source__c = 'Migration';
                if (String.isBlank(adminScope.Approval_Reference__c)) adminScope.Approval_Reference__c = 'R360-MOCK-PERSONA-MIGRATION';
                if (adminScope.Last_Certified_At__c == null) adminScope.Last_Certified_At__c = certifiedAt;
                adminScope.Certified_By__c = administratorId;
                changes.add(adminScope);
            }
            Set<Id> sharingUserIds = new Set<Id>();
            sharingUserIds.add(administratorId);
            for (User demoUser : usersByFederationId.values()) sharingUserIds.add(demoUser.Id);
            Resource360RoleScopeService.suppressSharingRebuild = true;
            try {
                if (!changes.isEmpty()) upsert changes Scope_Key__c;
            } finally {
                Resource360RoleScopeService.suppressSharingRebuild = false;
            }

            List<Resource__c> resources = [
                SELECT Id, Employee_ID__c, Salesforce_User__c
                FROM Resource__c
                WHERE Employee_ID__c IN ('EXL-017091','EXL-018462','EXL-019830')
            ];
            Map<String, String> resourcePersona = new Map<String, String>{
                'EXL-018462' => 'R360-DEMO-PRACTITIONER',
                'EXL-019830' => 'R360-DEMO-MANAGER',
                'EXL-017091' => 'R360-DEMO-PROJECT'
            };
            for (Resource__c resource : resources) {
                User personaUser = usersByFederationId.get(resourcePersona.get(resource.Employee_ID__c));
                if (personaUser != null) resource.Salesforce_User__c = personaUser.Id;
            }
            if (!resources.isEmpty()) update resources;
            User projectManager=usersByFederationId.get('R360-DEMO-PROJECT');
            if(projectManager!=null){List<Engagement__c>projects=[SELECT Id,Project_Manager__c FROM Engagement__c WHERE Intake_Correlation_ID__c LIKE 'R360-SCALE-10X20-V1-%'];for(Engagement__c project:projects)project.Project_Manager__c=projectManager.Id;if(!projects.isEmpty())update projects;}
            if (!sharingUserIds.isEmpty()) Resource360ScopeSharingService.rebuildUsers(sharingUserIds);
        }
    }

    private static String federationId(String key) {
        return 'R360-DEMO-'+key.toUpperCase();
    }

    private static String slug(String value) {
        return value.toUpperCase().replace(' ', '-').replace('/', '-');
    }

    private static List<PersonaPlan> plans() {
        return new List<PersonaPlan>{
            new PersonaPlan('practitioner', 'Practitioner', 'r360prac', true, new List<String>{'Practitioner','Executive Viewer','Auditor'}),
            new PersonaPlan('project', 'Project Manager', 'r360pmgr', true, new List<String>{'Project Manager','Account Owner'}),
            new PersonaPlan('manager', 'People Manager', 'r360mgr', true, new List<String>{'Reporting Manager'}),
            new PersonaPlan('staffer', 'COE Staffer', 'r360staf', true, new List<String>{'COE Staffer','Operations'}),
            new PersonaPlan('capability', 'Capability and Finance', 'r360capa', true, new List<String>{'Capability Administrator','Finance/PMO'}),
            new PersonaPlan('configmaker', 'Configuration Maker', 'r360cfgm', true, new List<String>{'Configuration Operator','Portfolio Manager'}),
            new PersonaPlan('checker', 'Configuration Checker', 'r360chkr', false, new List<String>{'Configuration Approver','HOD'}),
            new PersonaPlan('approver', 'Executive Approver', 'r360aprv', false, new List<String>{'Budget Approver','GM/COO Delegate','Timesheet Approver'})
        };
    }
}
