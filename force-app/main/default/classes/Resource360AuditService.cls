public without sharing class Resource360AuditService {
    public static Id record(String correlationId, String activeRole, String action, String entityType, Id entityId, Decimal version, String reasonCode, String detail, Map<String, Object> beforeState, Map<String, Object> afterState) {
        String beforeJson = beforeState == null ? null : JSON.serialize(beforeState);
        String afterJson = afterState == null ? null : JSON.serialize(afterState);
        String canonical = String.valueOf(beforeJson) + '|' + String.valueOf(afterJson) + '|' + action + '|' + String.valueOf(entityId);
        R360_Audit_Event__c eventRecord = new R360_Audit_Event__c(
            Event_ID__c = stableKey(correlationId + '|' + action + '|' + String.valueOf(entityId)),
            Correlation_ID__c = correlationId,
            Actor__c = UserInfo.getUserId(),
            Active_Role__c = String.isBlank(activeRole) ? 'Resource 360 User' : activeRole,
            Action__c = action,
            Entity_Type__c = entityType,
            Entity_ID__c = String.valueOf(entityId),
            Entity_Version__c = version == null ? 1 : version,
            Reason_Code__c = truncate(reasonCode, 80),
            Detail__c = truncate(detail, 4000),
            Before_JSON__c = truncate(beforeJson, 8000),
            After_JSON__c = truncate(afterJson, 8000),
            Payload_Hash__c = EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(canonical))),
            Occurred_At__c = System.now()
        );
        insert eventRecord;
        return eventRecord.Id;
    }

    public static Map<String, Object> state(String state, String note) {
        return new Map<String, Object>{ 'state' => state, 'note' => note };
    }

    private static String stableKey(String value) { return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(value))); }
    private static String truncate(String value, Integer length) { return value != null && value.length() > length ? value.substring(0, length) : value; }
}
