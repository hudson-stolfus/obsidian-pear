import {Attachment} from "./attachment";
import {moment} from "obsidian";
import {Task} from "../task";

export class Deadline extends Attachment {
	public upcoming: boolean;
	public overdue: boolean;

	private display: string;

	constructor(parent: Task, public timestamp: moment.Moment) {
		super(parent);
		this.type = 'date';
		this.update();
	}

	update() {
		this.upcoming = this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment();
		this.overdue = this.timestamp < moment();
	}

	render(task: HTMLElement) {
		super.render(task);
		if (this.timestamp > moment().add(this.plugin.settings.showPeriod.period, this.plugin.settings.showPeriod.unit)) {
			this.parent.hidden = true;
		}
		this.display = this.timestamp.format(this.plugin.settings.dateFormats[0]) ?? "";
		if (this.overdue) {
			this.element.addClass('pear-overdue');
			this.display = this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1);
			if (this.timestamp.clone().add(2, "weeks") < moment()) {
				this.element.addClass('pear-overdue-far');
			}
		}
		this.upcoming = this.timestamp.clone().subtract(36, "hours") < moment() && this.timestamp >= moment();
		if (this.upcoming) {
			this.element.addClass('pear-upcoming');
			this.display = this.timestamp.fromNow().charAt(0).toUpperCase() + this.timestamp.fromNow().substring(1);
		}
		this.element.innerText = this.display;
		this.element.addEventListener("mouseenter", (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			target.innerText = this.timestamp.format("dddd, MMMM Do, YYYY \\at h:mma") ?? "Error";
		});
		this.element.addEventListener("mouseleave", (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			target.innerText = this.display;
		});
	}
}
