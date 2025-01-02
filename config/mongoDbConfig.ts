import { ConfigService } from '@nestjs/config';
import { MongooseModuleFactoryOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Logger } from '@nestjs/common';

export const mongoConfig = async (
  configService: ConfigService,
): Promise<MongooseModuleFactoryOptions> => {
  const logger = new Logger('MongoDB');
  const uri = configService.get<string>('MONGODB_URI');
  const setupMongoEventListeners = () => {
    mongoose.connection.on('connected', () => {
      console.log(28);
      logger.log('MongoDB connected successfully');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error(`MongoDB connection error: ${error.message}`);
    });
  };

  const setupProcessEventListeners = () => {
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB disconnection:', err);
        process.exit(1);
      }
    });
  };

  // Устанавливаем слушатели событий
  setupMongoEventListeners();
  setupProcessEventListeners();
  return {
    uri,
    retryAttempts: 3,
    retryDelay: 1000,
    connectionFactory: (connection) => {
      connection.on('reconnected', () => {
        logger.log('MongoDB reconnected');
      });

      connection.on('reconnectFailed', () => {
        logger.error('MongoDB reconnection failed');
      });

      return connection;
    },
  };
};
