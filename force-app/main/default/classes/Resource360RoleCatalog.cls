public inherited sharing class Resource360RoleCatalog {
    public class DeliveryRole {
        @AuraEnabled public String code;
        @AuraEnabled public String label;
        @AuraEnabled public String tower;
        @AuraEnabled public Date effectiveFrom;
        @AuraEnabled public Date effectiveTo;
    }

    public static List<DeliveryRole> activeRoles(){
        Date today=Resource360Policy.effectiveDate();Map<String,DeliveryRole> values=new Map<String,DeliveryRole>();
        for(R360_Delivery_Role__mdt role:[SELECT DeveloperName,MasterLabel,Role_Code__c,Tower__c,Effective_From__c,Effective_To__c FROM R360_Delivery_Role__mdt WHERE Active__c=true ORDER BY MasterLabel]){if((role.Effective_From__c!=null&&role.Effective_From__c>today)||(role.Effective_To__c!=null&&role.Effective_To__c<today))continue;DeliveryRole item=new DeliveryRole();item.code=String.isBlank(role.Role_Code__c)?role.DeveloperName:role.Role_Code__c;item.label=role.MasterLabel;item.tower=role.Tower__c;item.effectiveFrom=role.Effective_From__c;item.effectiveTo=role.Effective_To__c;values.put(item.code,item);}Set<String>processed=new Set<String>();for(R360_Configuration__c configured:Resource360ConfigurationService.activeDomain('Delivery Role')){if(processed.contains(configured.Code__c))continue;processed.add(configured.Code__c);if(configured.Boolean_Value__c!=true){values.remove(configured.Code__c);continue;}Map<String,Object>attributes=String.isBlank(configured.Attributes_JSON__c)?new Map<String,Object>():(Map<String,Object>)JSON.deserializeUntyped(configured.Attributes_JSON__c);DeliveryRole item=new DeliveryRole();item.code=configured.Code__c;item.label=configured.Display_Label__c;item.tower=(String)attributes.get('tower');item.effectiveFrom=configured.Effective_From__c;item.effectiveTo=configured.Effective_To__c;values.put(item.code,item);}List<DeliveryRole>result=values.values();result.sort(new RoleComparator());return result;
    }

    public static String requireActive(String roleName){if(String.isBlank(roleName))throw new AuraHandledException('A governed Salesforce delivery role is required.');for(DeliveryRole role:activeRoles())if(role.label.equalsIgnoreCase(roleName.trim())||role.code.equalsIgnoreCase(roleName.trim()))return role.label;throw new AuraHandledException('The selected Salesforce delivery role is inactive or not governed.');}
    private class RoleComparator implements Comparator<DeliveryRole>{public Integer compare(DeliveryRole left,DeliveryRole right){return left.label.toLowerCase().compareTo(right.label.toLowerCase());}}
}
