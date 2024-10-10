import {Attachment} from "./attachment";
import {moment} from "obsidian";
import {COMPLETE, REVOKED, Task} from "./task";
import PearPlugin from "./main";

export class Deadline extends Attachment {
	public timestamp: moment.Moment;

	constructor(parent: Task, plugin: PearPlugin) {
		super(parent, plugin);
		const datePattern = this.parent.raw.match(/(?<=@)\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g);
		if (datePattern == null) throw new Error(`Failed to initialize deadline on pear-${parent.id}: DATE NOT FOUND`);
		if (datePattern[0].search(/\d{1,2}((:\d{2}[ap]m?)|(:\d{2})|([ap]m?))/g) === -1) {
			this.timestamp = moment(datePattern, this.plugin.settings.dateFormats).set({ hour: 23, minute: 59, second: 59 });
		} else {
			this.timestamp = moment(datePattern, this.plugin.settings.dateFormats);
		}
	}

	render(task: HTMLElement): { replaced: RegExp, element: HTMLElement } {
		document.getElementById(`${this.parent.id}-deadline`)?.remove();
		if (this.plugin.settings.hideCompleted && this.parent.matchStatus(COMPLETE + "|" + REVOKED)) {
			this.parent.hidden = true;
		}
		const dateHint = task.createDiv({
			attr: {
				"id": `${this.parent.id}-deadline`
			},
			cls: `pear-date${(this.timestamp < moment()) ? " pear-overdue" : ""}${this.plugin.settings.floatingDates ? " pear-floating" : ""}${(this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) ? " pear-upcoming" : ""}`,
			text: (this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) ? this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1) : this.timestamp.format(this.plugin.settings.dateFormats[0])
		});

		dateHint.addEventListener("mouseenter", (event) => {
			// @ts-ignore
			event.target.innerText = this.timestamp.format("dddd, MMMM Do, YYYY \\at h:mma") ?? "";
		});

		dateHint.addEventListener("mouseleave", (event) => {
			// @ts-ignore
			event.target.innerText = (this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment()) ? this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1) : this.timestamp?.format(this.plugin.settings.dateFormats[0]) ?? "";
		});

		if (this.timestamp > moment().add(this.plugin.settings.showPeriod.period, this.plugin.settings.showPeriod.unit)) {
			this.parent.hidden = true;
		}

		return { replaced: /@\d{1,2}\/\d{1,2}(\/\d{2,4})?( \d{1,2}(:\d{2})?([ap]m)?)?/g, element: dateHint };
	}

	serialize(): object {
		return {
			timestamp: this.timestamp.toISOString(),
		};
	}
}
