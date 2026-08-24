Resource360Service.ServiceResult activation = Resource360AssuranceService.runDemoActivation(
    'Authorized five-pillar sanitized demonstration rehearsal.'
);
System.debug(LoggingLevel.INFO, JSON.serialize(activation));
