trigger Resource360AuditImmutable on R360_Audit_Event__c (before update, before delete) {
    for (R360_Audit_Event__c record : Trigger.old) record.addError('Resource 360 audit evidence is immutable.');
}
