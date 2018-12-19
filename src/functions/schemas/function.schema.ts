import * as mongoose from 'mongoose';

export interface FunctionInterface {
	name: string;
	revision: string;
	appName: string;
	tags: object;
}

export const FunctionSchema = new mongoose.Schema({
	name: String,
	revision: String,
	appName: String,
	tags: Object,
});