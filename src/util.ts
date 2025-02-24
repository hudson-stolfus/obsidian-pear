function indent(source: string): number {
	source = source.substring(0, source.search(/\S/g));
	const spaces = source.match(/ /g)?.length ?? 0;
	const tabs = source.match(/\t/g)?.length ?? 0;
	return spaces / 4 + tabs;
}

export {indent};
