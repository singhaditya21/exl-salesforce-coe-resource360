public inherited sharing class Resource360Policy {
    private static final Map<String, Decimal> FALLBACK_NUMERIC = new Map<String, Decimal>{
        'Default_Daily_Capacity' => 8,
        'Staffing_Expiry_Hours' => 72,
        'Budget_Auto_Approve_Margin' => 30,
        'Budget_HOD_Margin' => 25,
        'Budget_Executive_Margin' => 20,
        'Credential_Warning_Days' => 90,
        'Timesheet_Decision_Days' => 5,
        'Timesheet_Auto_Approve_Days' => 7
    };

    public static Decimal numberValue(String developerName) {
        return numberValue(developerName, FALLBACK_NUMERIC.get(developerName));
    }

    public static Decimal numberValue(String developerName, Decimal fallbackValue) {
        R360_Policy__mdt policy = R360_Policy__mdt.getInstance(developerName);
        Date today = Date.today();
        if (policy == null || !policy.Active__c || policy.Numeric_Value__c == null ||
            (policy.Effective_From__c != null && today < policy.Effective_From__c) ||
            (policy.Effective_To__c != null && today > policy.Effective_To__c)) {
            return fallbackValue;
        }
        return policy.Numeric_Value__c;
    }

    public static String textValue(String developerName, String fallbackValue) {
        R360_Policy__mdt policy = R360_Policy__mdt.getInstance(developerName);
        Date today = Date.today();
        if (policy == null || !policy.Active__c || String.isBlank(policy.Text_Value__c) ||
            (policy.Effective_From__c != null && today < policy.Effective_From__c) ||
            (policy.Effective_To__c != null && today > policy.Effective_To__c)) {
            return fallbackValue;
        }
        return policy.Text_Value__c;
    }
}
