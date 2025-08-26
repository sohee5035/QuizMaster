// Environment validation and configuration
interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL?: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  config: Partial<EnvironmentConfig>;
}

export function validateEnvironment(): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const config: Partial<EnvironmentConfig> = {};

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  config.NODE_ENV = nodeEnv;
  
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set, defaulting to "development"');
  }

  // Validate PORT
  const portStr = process.env.PORT || '5000';
  const port = parseInt(portStr, 10);
  
  if (isNaN(port) || port <= 0 || port > 65535) {
    warnings.push(`Invalid PORT "${portStr}", using default 5000`);
    config.PORT = 5000;
  } else {
    config.PORT = port;
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    if (nodeEnv === 'production') {
      errors.push('DATABASE_URL is required in production environment');
    } else {
      warnings.push('DATABASE_URL not set - using in-memory storage (development only)');
    }
  } else {
    config.DATABASE_URL = process.env.DATABASE_URL;
    
    // Basic URL validation
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      errors.push('DATABASE_URL is not a valid URL format');
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    config
  };
}

export function logEnvironmentStatus(): ValidationResult {
  const validation = validateEnvironment();
  
  console.log('\n🔧 Environment Configuration Check:');
  console.log(`   NODE_ENV: ${validation.config.NODE_ENV}`);
  console.log(`   PORT: ${validation.config.PORT}`);
  console.log(`   DATABASE: ${validation.config.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }
  
  if (validation.config.NODE_ENV === 'production') {
    console.log('\n🚀 Production Environment Checklist:');
    console.log(`   ✓ NODE_ENV set to production`);
    console.log(`   ${validation.config.DATABASE_URL ? '✓' : '❌'} DATABASE_URL configured`);
    console.log(`   ✓ PORT configured (${validation.config.PORT})`);
    
    if (!validation.isValid) {
      console.log('\n💡 To fix production deployment issues:');
      console.log('   1. Go to the Deployments Configuration tab');
      console.log('   2. Add the required environment variables:');
      validation.errors.forEach(error => {
        if (error.includes('DATABASE_URL')) {
          console.log('      • DATABASE_URL: Your PostgreSQL connection string');
        }
      });
      console.log('   3. Redeploy your application');
    }
  }
  
  return validation;
}

export function requireEnvironmentVariable(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  
  if (!value) {
    const error = `Missing required environment variable: ${name}`;
    console.error(`❌ ${error}`);
    
    if (process.env.NODE_ENV === 'production') {
      console.error(`💥 Production deployment requires ${name} to be set`);
      throw new Error(error);
    } else {
      console.warn(`⚠️  Development mode: ${name} not set, proceeding without it`);
      return '';
    }
  }
  
  return value;
}