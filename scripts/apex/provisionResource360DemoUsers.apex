Resource360DemoProvisioner.ProvisioningResult result = Resource360DemoProvisioner.provision();
System.debug(LoggingLevel.INFO, result.message+' Scope job: '+result.scopeJobId);
