import {Attachment} from "./attachment";
import {moment} from "obsidian";
import {COMPLETE, REVOKED, Task} from "./task";
import PearPlugin from "./main";

export class Deadline extends Attachment {
	public timestamp: moment.Moment;

	constructor(parent: Task, plugin: PearPlugin) {
		super(parent, plugin);
		const datePattern = this.parent.raw.match(/(?<=@)\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g);
		if (datePattern == null) throw new Error(`Failed to initialize deadline on "${parent.raw}": DATE NOT FOUND`);
		if (datePattern[0].search(/\d{1,2}((:\d{2}[ap]m?)|(:\d{2})|([ap]m?))/g) === -1) {
			this.timestamp = moment(datePattern, this.plugin.settings.dateFormats).set({ hour: 23, minute: 59, second: 59 });
		} else {
			this.timestamp = moment(datePattern, this.plugin.settings.dateFormats);
		}
	}

	render(task: HTMLElement) {
		if (this.timestamp > moment().add(this.plugin.settings.showPeriod.period, this.plugin.settings.showPeriod.unit)) {
			this.parent.hidden = true;
		}
		super.render(task);
		this.element.addClass('pear-date');
		if (this.timestamp < moment()) this.element.addClass('pear-overdue');
		if (this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) this.element.addClass('pear-upcoming');
		this.element.innerText = (this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) ? this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1) : this.timestamp.format(this.plugin.settings.dateFormats[0]);
		this.element.addEventListener("mouseenter", (event) => {
			// @ts-ignore
			event.target.innerText = this.timestamp.format("dddd, MMMM Do, YYYY \\at h:mma") ?? "";
		});

		this.element.addEventListener("mouseleave", (event) => {
			// @ts-ignore
			event.target.innerText = (this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) ? this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1) : this.timestamp?.format(this.plugin.settings.dateFormats[0]) ?? "";
		});

		task.childNodes.forEach((child) => {
			if (child.nodeName == '#text') {
				if (child.textContent) child.textContent = child.textContent.replace(/@\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g, '');
			}
		})
	}

	serialize(): object {
		return {
			timestamp: this.timestamp.toISOString(),
		};
	}
}
