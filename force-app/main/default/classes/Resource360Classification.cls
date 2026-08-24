public inherited sharing class Resource360Classification {
    public class ClassificationPolicy {
        public String value;
        public Boolean active;
        public Boolean billable;
        public Boolean requiresControl;
        public Boolean requiresSow;
        public Decimal defaultReviewDays;
        public String escalationPolicy;
        public Date effectiveFrom;
        public Date effectiveTo;
    }

    public static List<String> activeValues(){List<String>values=new List<String>(activePolicies().keySet());values.sort();return values;}
    public static ClassificationPolicy requireActive(String value){ClassificationPolicy policy=activePolicies().get(value);if(policy==null||!policy.active)throw new AuraHandledException('The selected engagement classification is not active under the effective Resource 360 policy.');return policy;}
    public static Boolean isBillable(String value){return requireActive(value).billable;}
    public static Boolean requiresControl(String value){return requireActive(value).requiresControl;}
    public static Boolean requiresSow(String value){return requireActive(value).requiresSow;}

    private static Map<String,ClassificationPolicy>activePolicies(){
        Date today=Resource360Policy.effectiveDate();Map<String,ClassificationPolicy>values=new Map<String,ClassificationPolicy>();
        for(R360_Classification__mdt policy:R360_Classification__mdt.getAll().values()){
            if(!policy.Active__c||String.isBlank(policy.Classification_Value__c)||(policy.Effective_From__c!=null&&policy.Effective_From__c>today)||(policy.Effective_To__c!=null&&policy.Effective_To__c<today))continue;
            ClassificationPolicy item=new ClassificationPolicy();item.value=policy.Classification_Value__c;item.active=true;item.billable=policy.Billable__c;item.requiresControl=policy.Requires_Control__c;item.requiresSow=policy.Requires_SOW__c;item.defaultReviewDays=policy.Default_Review_Days__c;item.escalationPolicy=policy.Escalation_Policy__c;item.effectiveFrom=policy.Effective_From__c;item.effectiveTo=policy.Effective_To__c;values.put(item.value,item);
        }
        Set<String>processed=new Set<String>();
        for(R360_Configuration__c configured:Resource360ConfigurationService.activeDomain('Classification')){
            if(processed.contains(configured.Code__c))continue;processed.add(configured.Code__c);
            if(configured.Boolean_Value__c!=true){values.remove(configured.Code__c);continue;}
            Map<String,Object>attributes=String.isBlank(configured.Attributes_JSON__c)?new Map<String,Object>():(Map<String,Object>)JSON.deserializeUntyped(configured.Attributes_JSON__c);
            ClassificationPolicy item=new ClassificationPolicy();item.value=configured.Code__c;item.active=true;item.billable=booleanAttribute(attributes,'billable');item.requiresControl=booleanAttribute(attributes,'requiresControl');item.requiresSow=booleanAttribute(attributes,'requiresSow');item.defaultReviewDays=decimalAttribute(attributes,'defaultReviewDays');item.escalationPolicy=(String)attributes.get('escalationPolicy');item.effectiveFrom=configured.Effective_From__c;item.effectiveTo=configured.Effective_To__c;values.put(item.value,item);
        }
        return values;
    }
    private static Boolean booleanAttribute(Map<String,Object>attributes,String key){return attributes.containsKey(key)&&Boolean.valueOf(String.valueOf(attributes.get(key)));}
    private static Decimal decimalAttribute(Map<String,Object>attributes,String key){return !attributes.containsKey(key)||attributes.get(key)==null?null:Decimal.valueOf(String.valueOf(attributes.get(key)));}
}
