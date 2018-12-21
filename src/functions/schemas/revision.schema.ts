import * as mongoose from 'mongoose';
import { IsNotEmpty } from 'class-validator';

export class RevisionInterface {
	@IsNotEmpty()
	name: string;
	@IsNotEmpty()
	revision: string;
	@IsNotEmpty()
	appName: string;
	tags: object;
	@IsNotEmpty()
	url: string;
	env: object;
}

export const RevisionSchema = new mongoose.Schema({
	name: String,
	revision: String,
	appName: String,
	tags: Object,
	url: String,
	env: Object,
});