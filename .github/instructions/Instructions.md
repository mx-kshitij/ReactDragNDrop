---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
# Project Instructions
This project is a Mendix widget developed using React and TypeScript. Mendix widgets are designed to be reusable components that can be easily integrated into Mendix applications.
## Coding Guidelines
- **Language**: Use TypeScript for all new code. Ensure type safety and leverage TypeScript features.
- **React**: Follow React best practices, including functional components and hooks where appropriate.
- **Mendix Integration**: Ensure that widgets properly integrate with Mendix's data sources and event handling mechanisms.
- **Styling**: Use CSS modules or styled-components for styling to avoid global namespace pollution.
- **Documentation**: Comment your code thoroughly but maintain up-to-date documentation only for the components and functions that the user explicitly requested.
- **Testing**: Write unit tests for features only when requested by the user, using Jest and React Testing Library.
- **Performance**: Optimize for performance, especially in data-intensive widgets.
- **Accessibility**: Ensure that widgets are accessible and comply with WCAG guidelines.
- **Version Control**: Follow Git best practices, including meaningful commit messages and branching strategies.
- **Dependencies**: Use only well-maintained and widely adopted libraries. Avoid unnecessary dependencies to keep the widget lightweight.
## Additional Context
When generating code, answering questions, or reviewing changes, always consider the context of Mendix widget development and the specific requirements of the project. Here are some additional resources that may help:
- [Mendix Widget Development Documentation](https://docs.mendix.com/developerportal/developing-widgets)
- [Mendix Pluggable Widgets Property Types](https://docs.mendix.com/apidocs-mxsdk/apidocs/pluggable-widgets-property-types/)
- [Mendix Pluggable Widgets Client APIs](https://docs.mendix.com/apidocs-mxsdk/apidocs/pluggable-widgets-client-apis/)
- [Mendix Pluggable Widgets Client APIs - List Values](https://docs.mendix.com/apidocs-mxsdk/apidocs/pluggable-widgets-client-apis-list-values/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) 