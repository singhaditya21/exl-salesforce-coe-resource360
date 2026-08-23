public inherited sharing class Resource360Classification {
    public static List<String> activeValues(){Date today=Date.today();List<String>values=new List<String>();for(R360_Classification__mdt policy:R360_Classification__mdt.getAll().values())if(policy.Active__c&&String.isNotBlank(policy.Classification_Value__c)&&(policy.Effective_From__c==null||policy.Effective_From__c<=today)&&(policy.Effective_To__c==null||policy.Effective_To__c>=today))values.add(policy.Classification_Value__c);values.sort();return values;}
    public static R360_Classification__mdt requireActive(String value){R360_Classification__mdt policy=find(value);if(policy==null||!policy.Active__c)throw new AuraHandledException('The selected engagement classification is not active under the effective Resource 360 policy.');return policy;}
    public static Boolean isBillable(String value){R360_Classification__mdt policy=requireActive(value);return policy.Billable__c;}
    public static Boolean requiresControl(String value){R360_Classification__mdt policy=requireActive(value);return policy.Requires_Control__c;}
    public static Boolean requiresSow(String value){R360_Classification__mdt policy=requireActive(value);return policy.Requires_SOW__c;}
    private static R360_Classification__mdt find(String value){Date today=Date.today();for(R360_Classification__mdt policy:R360_Classification__mdt.getAll().values())if(policy.Classification_Value__c==value&&(policy.Effective_From__c==null||policy.Effective_From__c<=today)&&(policy.Effective_To__c==null||policy.Effective_To__c>=today))return policy;return null;}
}
