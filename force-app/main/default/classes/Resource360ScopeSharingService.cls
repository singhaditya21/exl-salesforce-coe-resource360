public without sharing class Resource360ScopeSharingService {
    private static final String ROW_CAUSE = 'Resource360_Scope__c';
    private static final List<String> MANAGED_OBJECTS = new List<String>{
        'Allocation__c',
        'Budget__c',
        'Commercial_Reference__c',
        'Credential__c',
        'Engagement__c',
        'R360_Approval_Decision__c',
        'R360_Audit_Event__c',
        'R360_Integration_Run__c',
        'R360_Learning_Achievement__c',
        'R360_Notification__c',
        'R360_Org_Unit__c',
        'R360_Outbox_Event__c',
        'R360_Portfolio__c',
        'R360_Project_Evidence__c',
        'R360_Role_Scope__c',
        'R360_Work_Calendar__c',
        'Resource__c',
        'Skill_Claim__c',
        'Staffing_Request__c',
        'Timesheet__c'
    };
    private static final Set<String> COMMERCIAL_ROLES = new Set<String>{
        'Project Manager',
        'COE Staffer',
        'Budget Approver',
        'Portfolio Manager',
        'Account Owner',
        'HOD',
        'GM/COO Delegate',
        'Finance/PMO',
        'Operations',
        'Auditor',
        'Executive Viewer'
    };

    public static void rebuildUsers(Set<Id> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        clearSharesForUsers(userIds);
        for (Id userId : userIds) rebuildUserInternal(userId);
    }

    public static void rebuildUser(Id userId) {
        if (userId == null) return;
        clearSharesForUsers(new Set<Id>{userId});
        rebuildUserInternal(userId);
    }

    private static void rebuildUserInternal(Id userId) {
        Date today = Date.today();
        List<R360_Role_Scope__c> scopes = [
            SELECT Id, Business_Role__c, Org_Unit_ID__c, Portfolio_ID__c
            FROM R360_Role_Scope__c
            WHERE User__c=:userId AND Active__c=true AND Valid_From__c<=:today
                AND (Valid_To__c=null OR Valid_To__c>=:today)
        ];
        Set<String> roles = new Set<String>();
        Set<String> orgUnits = new Set<String>();
        Set<String> portfolios = new Set<String>();
        Boolean allOrg = false;
        Boolean allPortfolio = false;
        for (R360_Role_Scope__c scope : scopes) {
            roles.add(scope.Business_Role__c);
            if (String.isBlank(scope.Org_Unit_ID__c)) allOrg = true;
            else orgUnits.add(scope.Org_Unit_ID__c);
            if (String.isBlank(scope.Portfolio_ID__c)) allPortfolio = true;
            else portfolios.add(scope.Portfolio_ID__c);
        }

        Map<String, Set<Id>> idsByObject = new Map<String, Set<Id>>();
        Map<String, String> accessByObject = new Map<String, String>();
        add(idsByObject, 'R360_Role_Scope__c', new Map<Id, R360_Role_Scope__c>(scopes).keySet());
        accessByObject.put('R360_Role_Scope__c', 'Read');

        Set<Id> resourceIds = new Set<Id>();
        Set<Id> selfResourceIds = new Set<Id>();
        if (allOrg) {
            for (Resource__c resource : [SELECT Id, Salesforce_User__c FROM Resource__c LIMIT 9000]) {
                resourceIds.add(resource.Id);
                if (resource.Salesforce_User__c == userId) selfResourceIds.add(resource.Id);
            }
        } else if (orgUnits.isEmpty()) {
            for (Resource__c resource : [SELECT Id FROM Resource__c WHERE Salesforce_User__c=:userId LIMIT 9000]) {
                resourceIds.add(resource.Id);
                selfResourceIds.add(resource.Id);
            }
        } else {
            for (Resource__c resource : [SELECT Id, Salesforce_User__c FROM Resource__c WHERE Salesforce_User__c=:userId OR Org_Unit_ID__c IN :orgUnits LIMIT 9000]) {
                resourceIds.add(resource.Id);
                if (resource.Salesforce_User__c == userId) selfResourceIds.add(resource.Id);
            }
        }
        if (!resourceIds.isEmpty()) {
            add(idsByObject, 'Resource__c', resourceIds);
            accessByObject.put('Resource__c', 'Read');
        }

        Set<Id> engagementIds = new Set<Id>();
        if (allPortfolio) {
            for (Engagement__c engagement : [SELECT Id FROM Engagement__c LIMIT 9000]) engagementIds.add(engagement.Id);
        } else if (portfolios.isEmpty()) {
            for (Engagement__c engagement : [SELECT Id FROM Engagement__c WHERE Project_Manager__c=:userId LIMIT 9000]) engagementIds.add(engagement.Id);
        } else {
            for (Engagement__c engagement : [SELECT Id FROM Engagement__c WHERE Project_Manager__c=:userId OR Portfolio_ID__c IN :portfolios LIMIT 9000]) engagementIds.add(engagement.Id);
        }
        if (!engagementIds.isEmpty()) {
            add(idsByObject, 'Engagement__c', engagementIds);
            accessByObject.put('Engagement__c', roles.contains('Project Manager') ? 'Edit' : 'Read');
        }

        if (roles.contains('COE Staffer')) {
            mapByLookup(idsByObject, 'Staffing_Request__c', 'Engagement__c', engagementIds);
            mapByLookup(idsByObject, 'Allocation__c', 'Engagement__c', engagementIds);
            accessByObject.put('Staffing_Request__c', 'Edit');
            accessByObject.put('Allocation__c', 'Edit');
        }
        if (roles.contains('Project Manager')) {
            mapByLookup(idsByObject, 'Budget__c', 'Engagement__c', engagementIds);
            mapByLookup(idsByObject, 'Staffing_Request__c', 'Engagement__c', engagementIds);
            mapByLookup(idsByObject, 'Allocation__c', 'Engagement__c', engagementIds);
            accessByObject.put('Budget__c', 'Read');
            accessByObject.put('Staffing_Request__c', 'Read');
            accessByObject.put('Allocation__c', 'Read');
        }
        if (roles.contains('Portfolio Manager') || roles.contains('HOD') || roles.contains('GM/COO Delegate') || roles.contains('Budget Approver') || roles.contains('Finance/PMO')) {
            mapByLookup(idsByObject, 'Budget__c', 'Engagement__c', engagementIds);
            accessByObject.put('Budget__c', 'Edit');
            Set<Id> budgetIds = idsByObject.get('Budget__c');
            if (budgetIds != null && !budgetIds.isEmpty()) {
                Set<String> textIds = new Set<String>();
                for (Id budgetId : budgetIds) textIds.add(String.valueOf(budgetId));
                add(idsByObject, 'R360_Approval_Decision__c', queryTextIds('R360_Approval_Decision__c', 'Entity_ID__c', textIds));
                accessByObject.put('R360_Approval_Decision__c', 'Edit');
            }
        }
        if (roles.contains('Account Owner') || roles.contains('Executive Viewer')) {
            mapByLookup(idsByObject, 'Budget__c', 'Engagement__c', engagementIds);
            mapByLookup(idsByObject, 'Staffing_Request__c', 'Engagement__c', engagementIds);
            mapByLookup(idsByObject, 'Allocation__c', 'Engagement__c', engagementIds);
            accessByObject.put('Budget__c', 'Read');
            accessByObject.put('Staffing_Request__c', 'Read');
            accessByObject.put('Allocation__c', 'Read');
        }
        Boolean canViewCommercial = false;
        for (String commercialRole : COMMERCIAL_ROLES) {
            if (roles.contains(commercialRole)) {
                canViewCommercial = true;
                break;
            }
        }
        if (canViewCommercial) {
            mapByLookup(idsByObject, 'Commercial_Reference__c', 'Engagement__c', engagementIds);
            accessByObject.put('Commercial_Reference__c', 'Read');
        }
        if (roles.contains('Reporting Manager') || roles.contains('Capability Administrator')) {
            mapByLookup(idsByObject, 'Skill_Claim__c', 'Resource__c', resourceIds);
            mapByLookup(idsByObject, 'Credential__c', 'Resource__c', resourceIds);
            mapByLookup(idsByObject, 'R360_Project_Evidence__c', 'Resource__c', resourceIds);
            mapByLookup(idsByObject, 'R360_Learning_Achievement__c', 'Resource__c', resourceIds);
            accessByObject.put('Skill_Claim__c', 'Edit');
            accessByObject.put('Credential__c', roles.contains('Capability Administrator') ? 'Edit' : 'Read');
            accessByObject.put('R360_Project_Evidence__c', roles.contains('Capability Administrator') ? 'Edit' : 'Read');
            accessByObject.put('R360_Learning_Achievement__c', roles.contains('Capability Administrator') ? 'Edit' : 'Read');
        }
        if (roles.contains('Practitioner')) {
            mapByLookup(idsByObject, 'Skill_Claim__c', 'Resource__c', selfResourceIds);
            mapByLookup(idsByObject, 'Credential__c', 'Resource__c', selfResourceIds);
            mapByLookup(idsByObject, 'R360_Project_Evidence__c', 'Resource__c', selfResourceIds);
            mapByLookup(idsByObject, 'R360_Learning_Achievement__c', 'Resource__c', selfResourceIds);
            accessByObject.put('Skill_Claim__c', 'Edit');
            accessByObject.put('Credential__c', 'Edit');
            accessByObject.put('R360_Project_Evidence__c', 'Read');
            accessByObject.put('R360_Learning_Achievement__c', 'Read');
        }
        if (roles.contains('Reporting Manager') || roles.contains('Timesheet Approver')) {
            mapByLookup(idsByObject, 'Timesheet__c', 'Resource__c', resourceIds);
            accessByObject.put('Timesheet__c', 'Edit');
        }
        if (roles.contains('Practitioner')) {
            mapByLookup(idsByObject, 'Timesheet__c', 'Resource__c', selfResourceIds);
            accessByObject.put('Timesheet__c', 'Edit');
        }
        add(idsByObject, 'R360_Notification__c', queryIds('R360_Notification__c', 'Recipient__c', new Set<Id>{userId}));
        accessByObject.put('R360_Notification__c', 'Edit');
        if (roles.contains('Auditor') || roles.contains('Operations')) {
            add(idsByObject, 'R360_Approval_Decision__c', queryAllIds('R360_Approval_Decision__c'));
            if (!accessByObject.containsKey('R360_Approval_Decision__c')) accessByObject.put('R360_Approval_Decision__c', 'Read');
            add(idsByObject, 'R360_Audit_Event__c', queryAllIds('R360_Audit_Event__c'));
            accessByObject.put('R360_Audit_Event__c', 'Read');
        }
        if (roles.contains('Operations')) {
            for (String objectName : new List<String>{'R360_Integration_Run__c', 'R360_Outbox_Event__c', 'R360_Org_Unit__c', 'R360_Portfolio__c', 'R360_Work_Calendar__c'}) {
                add(idsByObject, objectName, queryAllIds(objectName));
                accessByObject.put(objectName, 'Edit');
            }
        }
        for (String objectName : idsByObject.keySet()) {
            insertShares(objectName, idsByObject.get(objectName), userId, accessByObject.get(objectName));
        }
    }

    private static void clearSharesForUsers(Set<Id> userIds) {
        for (String objectName : MANAGED_OBJECTS) {
            String shareObject = objectName.replace('__c', '__Share');
            List<SObject> existing = Database.query(
                'SELECT Id FROM ' + shareObject + ' WHERE UserOrGroupId IN :userIds AND RowCause=:ROW_CAUSE LIMIT 10000'
            );
            if (!existing.isEmpty()) Database.delete(existing, false);
        }
    }

    private static void mapByLookup(Map<String, Set<Id>> target, String objectName, String lookupField, Set<Id> parentIds) {
        if (parentIds != null && !parentIds.isEmpty()) add(target, objectName, queryIds(objectName, lookupField, parentIds));
    }

    private static Set<Id> queryIds(String objectName, String fieldName, Set<Id> values) {
        Set<Id> result = new Set<Id>();
        if (values.isEmpty()) return result;
        for (SObject record : Database.query('SELECT Id FROM ' + objectName + ' WHERE ' + fieldName + ' IN :values LIMIT 9000')) result.add(record.Id);
        return result;
    }

    private static Set<Id> queryTextIds(String objectName, String fieldName, Set<String> values) {
        Set<Id> result = new Set<Id>();
        if (values.isEmpty()) return result;
        for (SObject record : Database.query('SELECT Id FROM ' + objectName + ' WHERE ' + fieldName + ' IN :values LIMIT 9000')) result.add(record.Id);
        return result;
    }

    private static Set<Id> queryAllIds(String objectName) {
        Set<Id> result = new Set<Id>();
        for (SObject record : Database.query('SELECT Id FROM ' + objectName + ' LIMIT 9000')) result.add(record.Id);
        return result;
    }

    private static void add(Map<String, Set<Id>> target, String objectName, Set<Id> ids) {
        if (ids == null || ids.isEmpty()) return;
        if (!target.containsKey(objectName)) target.put(objectName, new Set<Id>());
        target.get(objectName).addAll(ids);
    }

    private static void insertShares(String objectName, Set<Id> recordIds, Id userId, String accessLevel) {
        if (recordIds == null || recordIds.isEmpty()) return;
        Schema.SObjectType shareType = Schema.getGlobalDescribe().get(objectName.replace('__c', '__Share'));
        if (shareType == null) return;
        List<SObject> shares = new List<SObject>();
        for (Id recordId : recordIds) {
            SObject share = shareType.newSObject();
            share.put('ParentId', recordId);
            share.put('UserOrGroupId', userId);
            share.put('AccessLevel', String.isBlank(accessLevel) ? 'Read' : accessLevel);
            share.put('RowCause', ROW_CAUSE);
            shares.add(share);
        }
        if (!shares.isEmpty()) Database.insert(shares, false);
    }
}
