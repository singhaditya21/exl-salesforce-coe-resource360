public without sharing class Resource360Policy {
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
    private static Map<String,R360_Configuration__c> runtimeValues;

    public static Date effectiveDate(){return Date.valueOf(System.now().formatGMT('yyyy-MM-dd'));}

    public static Decimal numberValue(String developerName) {
        return numberValue(developerName, FALLBACK_NUMERIC.get(developerName));
    }

    public static Decimal numberValue(String developerName, Decimal fallbackValue) {
        R360_Configuration__c runtime=runtimeValue(developerName);
        if(runtime!=null&&runtime.Value_Type__c=='Number'&&runtime.Numeric_Value__c!=null)return runtime.Numeric_Value__c;
        R360_Policy__mdt policy = R360_Policy__mdt.getInstance(developerName);
        Date today = effectiveDate();
        if (policy == null || !policy.Active__c || policy.Numeric_Value__c == null ||
            (policy.Effective_From__c != null && today < policy.Effective_From__c) ||
            (policy.Effective_To__c != null && today > policy.Effective_To__c)) {
            return fallbackValue;
        }
        return policy.Numeric_Value__c;
    }

    public static String textValue(String developerName, String fallbackValue) {
        R360_Configuration__c runtime=runtimeValue(developerName);
        if(runtime!=null&&runtime.Value_Type__c=='Text'&&String.isNotBlank(runtime.Text_Value__c))return runtime.Text_Value__c;
        R360_Policy__mdt policy = R360_Policy__mdt.getInstance(developerName);
        Date today = effectiveDate();
        if (policy == null || !policy.Active__c || String.isBlank(policy.Text_Value__c) ||
            (policy.Effective_From__c != null && today < policy.Effective_From__c) ||
            (policy.Effective_To__c != null && today > policy.Effective_To__c)) {
            return fallbackValue;
        }
        return policy.Text_Value__c;
    }

    public static Boolean booleanValue(String developerName,Boolean fallbackValue){
        R360_Configuration__c runtime=runtimeValue(developerName);if(runtime!=null&&runtime.Value_Type__c=='Boolean')return runtime.Boolean_Value__c;
        R360_Policy__mdt policy=R360_Policy__mdt.getInstance(developerName);Date today=effectiveDate();if(policy==null||!policy.Active__c||(policy.Effective_From__c!=null&&today<policy.Effective_From__c)||(policy.Effective_To__c!=null&&today>policy.Effective_To__c))return fallbackValue;return policy.Boolean_Value__c;
    }

    public static List<String>listValue(String developerName,List<String>fallbackValue){String configured=textValue(developerName,null);if(String.isBlank(configured))return fallbackValue;List<String>result=new List<String>();try{if(configured.trim().startsWith('[')){for(Object item:(List<Object>)JSON.deserializeUntyped(configured))if(String.isNotBlank(String.valueOf(item)))result.add(String.valueOf(item).trim());}else{String delimiter=configured.contains('|')?'\\|':',';for(String item:configured.split(delimiter))if(String.isNotBlank(item))result.add(item.trim());}}catch(Exception failure){return fallbackValue;}return result.isEmpty()?fallbackValue:result;}

    public static String jsonValue(String developerName,String fallbackValue){R360_Configuration__c runtime=runtimeValue(developerName);if(runtime!=null&&runtime.Value_Type__c=='JSON'&&String.isNotBlank(runtime.Attributes_JSON__c))return runtime.Attributes_JSON__c;return textValue(developerName,fallbackValue);}

    @TestVisible public static void clearCache(){runtimeValues=null;}
    private static R360_Configuration__c runtimeValue(String developerName){if(runtimeValues==null){runtimeValues=new Map<String,R360_Configuration__c>();Date today=effectiveDate();Set<String>policyDomains=new Set<String>{'Policy','Approval','Escalation','Notification','Integration','KPI'};for(R360_Configuration__c record:[SELECT Code__c,Value_Type__c,Numeric_Value__c,Text_Value__c,Boolean_Value__c,Attributes_JSON__c,Version__c FROM R360_Configuration__c WHERE Domain__c IN:policyDomains AND State__c='Active' AND Effective_From__c<=:today AND (Effective_To__c=null OR Effective_To__c>=:today) ORDER BY Version__c DESC])if(!runtimeValues.containsKey(record.Code__c))runtimeValues.put(record.Code__c,record);}return runtimeValues.get(developerName);}
}
