# Obsidian Pear

![Obsidian Pear](banner.svg)

`P`roductivity
`E`vents
`A`nd
`R`esearch


Obsidian pear is a productivity plugin developed for a straightforward experience, keeping track of all of your needs. Integrated into [Obsidian.md](https://obsidian.md/), the Pear Productivity plugin utilizes a flexibly and friendly format which works with all of your notes.

> [!NOTE]
> This plugin is maintained by a single student
> - There is no guarantee that issues will be addressed in a timely manner
> - Feel free to fork or [contribute](#contributing)

## How to Use
After enabling the plugin in `Community Plugins`, any task created is processed by Pear. This plugin does not remove the basic functionality of obsidian tasks, but rather adds properties in YAML.
```md
- [ ] My task title
  created: !time 2025-02-24 08:00:00
  due: !time 2025-02-25 23:59:59
  priority: 0
  estimate: !dur 00:20:00
  notes: "Hello, YAML! I can use **Markdown** here too."
```
Embedding tasks with a filter is similar to Obsidian's native `query` functionality. The following block creates a callout filtering through tasks due between March 1, 2025 and March 3, 2025, with a note containing "Hello! World!" 
```md
	```pear
	heading: My Embed
	icon: calendar-check
	source: 'path/to/myTODOFile'
	due: !range
		- !time 2025-03-01 00:00:00
		- !time 2025-03-03 00:00:00
	notes: Hello, World!
	```
```
That's it for now!

## Upcoming
In the future Pear will see many research features for automatically summarizing notes.

## Contributing
Any contributions are appreciated. Report [here](https://github.com/Hudson-Stolfus/obsidian-pear/issues) if you are missing something or have found a bug. Would love to see [what you can do](https://github.com/Hudson-Stolfus/obsidian-pear/fork) with what I have started.
