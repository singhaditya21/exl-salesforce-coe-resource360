// Central authorization helper. This class bypasses record sharing only for
// exact-user entitlement/ownership predicates; domain services retain their
// own with/inherited sharing and CRUD/FLS enforcement.
public without sharing class Resource360Security {
    public static void requirePermission(String customPermission, String message) {
        if (!FeatureManagement.checkPermission(customPermission) && !hasModifyAllData()) {
            throw new AuraHandledException(message);
        }
    }

    public static Boolean hasPermission(String customPermission) {
        return FeatureManagement.checkPermission(customPermission) || hasModifyAllData();
    }

    public static Set<String> activeRoles() {
        Set<String> roles = new Set<String>();
        if (hasModifyAllData()) roles.add('Administrator');
        Set<String> governedRoles = new Set<String>();
        for (R360_Persona__mdt persona : [SELECT Business_Role__c FROM R360_Persona__mdt WHERE Active__c = true]) governedRoles.add(persona.Business_Role__c);
        Date today = Date.today();
        try {
            // Authorization must not depend on the asynchronous sharing rebuild. The
            // system-mode read is constrained to the current user's effective-dated
            // scope records; all returned labels are also checked against active CMDT.
            for (R360_Role_Scope__c scope : [
                SELECT Business_Role__c FROM R360_Role_Scope__c
                WHERE User__c = :UserInfo.getUserId() AND Active__c = true
                    AND Valid_From__c <= :today AND (Valid_To__c = null OR Valid_To__c >= :today)
                WITH SYSTEM_MODE
            ]) {
                if (governedRoles.contains(scope.Business_Role__c)) roles.add(scope.Business_Role__c);
            }
        } catch (QueryException inaccessible) {
            // Absence of scope-object access means no delegated business role.
        }
        return roles;
    }

    public static String decisionRole(String requiredPermission, String fallbackRole) {
        Set<String> roles = activeRoles();
        if (roles.contains(fallbackRole)) return fallbackRole;
        if (roles.contains('Administrator') && hasPermission(requiredPermission)) return 'Administrator';
        return fallbackRole;
    }

    public static void requireResourceOwnership(Id resourceId, String privilegedPermission, String message) {
        if (hasPermission(privilegedPermission)) return;
        List<Resource__c> owned = [
            SELECT Id FROM Resource__c WHERE Id = :resourceId AND Salesforce_User__c = :UserInfo.getUserId()
            WITH USER_MODE LIMIT 1
        ];
        if (owned.isEmpty()) throw new AuraHandledException(message);
    }

    public static List<SObject> readable(List<SObject> records) {
        if (records.isEmpty()) return records;
        return Security.stripInaccessible(AccessType.READABLE, records, true).getRecords();
    }

    public static List<SObject> createable(List<SObject> records) {
        if (records.isEmpty()) return records;
        return Security.stripInaccessible(AccessType.CREATABLE, records, true).getRecords();
    }

    public static List<SObject> updateable(List<SObject> records) {
        if (records.isEmpty()) return records;
        return Security.stripInaccessible(AccessType.UPDATABLE, records, true).getRecords();
    }

    @TestVisible
    private static Boolean hasModifyAllData() {
        return [SELECT PermissionsModifyAllData FROM Profile WHERE Id = :UserInfo.getProfileId()].PermissionsModifyAllData;
    }
}
