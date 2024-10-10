import {Task} from "./task";
import PearPlugin from "./main";

export abstract class Attachment {

	protected plugin: PearPlugin;

	constructor(public parent: Task, plugin: PearPlugin) {
		this.parent.attachments.push(this);
		this.plugin = plugin;
	}

	abstract render(element: HTMLElement): { replaced: RegExp, element: HTMLElement } ;

	abstract serialize(): object;

}
