import {Task} from "./task";
import PearPlugin from "./main";
import {moment} from "obsidian";

export abstract class Attachment {

	protected plugin: PearPlugin;
	public element: HTMLElement;

	constructor(public parent: Task, plugin: PearPlugin) {
		this.parent.attachments.push(this);
		this.plugin = plugin;
	}

	render(task: HTMLElement) {
		task.find('.pear-attachment')?.remove();
		this.element = task.createDiv({
			cls: 'pear-attachment'
		});
		if (this.parent.hidden) this.element.addClass('pear-hidden');
		task.find('input').after(this.element);
	}

}
