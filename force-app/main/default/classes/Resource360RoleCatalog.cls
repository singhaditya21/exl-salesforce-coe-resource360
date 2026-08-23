public inherited sharing class Resource360RoleCatalog {
    public class DeliveryRole {
        @AuraEnabled public String code;
        @AuraEnabled public String label;
        @AuraEnabled public String tower;
        @AuraEnabled public Date effectiveFrom;
        @AuraEnabled public Date effectiveTo;
    }

    public static List<DeliveryRole> activeRoles(){
        Date today=Date.today();List<DeliveryRole> result=new List<DeliveryRole>();
        for(R360_Delivery_Role__mdt role:[SELECT DeveloperName,MasterLabel,Role_Code__c,Tower__c,Effective_From__c,Effective_To__c FROM R360_Delivery_Role__mdt WHERE Active__c=true ORDER BY MasterLabel]){if((role.Effective_From__c!=null&&role.Effective_From__c>today)||(role.Effective_To__c!=null&&role.Effective_To__c<today))continue;DeliveryRole item=new DeliveryRole();item.code=String.isBlank(role.Role_Code__c)?role.DeveloperName:role.Role_Code__c;item.label=role.MasterLabel;item.tower=role.Tower__c;item.effectiveFrom=role.Effective_From__c;item.effectiveTo=role.Effective_To__c;result.add(item);}return result;
    }

    public static String requireActive(String roleName){if(String.isBlank(roleName))throw new AuraHandledException('A governed Salesforce delivery role is required.');for(DeliveryRole role:activeRoles())if(role.label.equalsIgnoreCase(roleName.trim())||role.code.equalsIgnoreCase(roleName.trim()))return role.label;throw new AuraHandledException('The selected Salesforce delivery role is inactive or not governed.');}
}
