import * as mongoose from 'mongoose';
import { ObjectID } from 'bson';

export interface FunctionInterface {
	id: string,
	name: string;
	revision: string;
	appName: string;
	tags: object;
}

export const FunctionSchema = new mongoose.Schema({
	id: ObjectID,
	name: String,
	revision: String,
	appName: String,
	tags: Object,
});