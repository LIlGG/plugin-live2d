## ADDED Requirements

### Requirement: Halo search tool SHALL use Halo full-text search
The plugin SHALL provide a server-executed Agent tool that searches public Halo resources through Halo SearchService.

#### Scenario: Search returns public trusted resources
- **WHEN** the model calls `search_halo_resources` with a keyword
- **THEN** the backend MUST call Halo `SearchService` with that keyword
- **AND** it MUST request public, published, non-recycled content by default
- **AND** it MUST return bounded resource metadata suitable for model selection and frontend trusted navigation

#### Scenario: Search filters allowed resource types
- **WHEN** the model provides `includeTypes`
- **THEN** the backend MUST intersect the requested types with the site-owner configured type allowlist
- **AND** it MUST NOT search or return types outside the allowlist

#### Scenario: Search result omits full content
- **WHEN** the backend returns search results to the model
- **THEN** each resource MUST include title, type, metadata name, permalink, description or excerpt where available
- **AND** it MUST NOT include the full document content

### Requirement: Halo resource detail tool SHALL return bounded public content
The plugin SHALL provide a server-executed Agent tool for reading limited details from trusted or current public Halo resources.

#### Scenario: Detail lookup enforces public resource constraints
- **WHEN** the model calls `get_halo_resource_detail`
- **THEN** the backend MUST only return details for public, published, non-recycled resources that are supported by the plugin
- **AND** it MUST reject or fail gracefully for unsupported, private, recycled, or unpublished resources

#### Scenario: Detail content is length limited
- **WHEN** the backend returns resource detail content
- **THEN** the content MUST be capped by the configured maximum and hard upper bound
- **AND** the result MUST indicate whether content was truncated

### Requirement: Halo latest resources SHALL be exposed through backend resource queries
The plugin SHALL provide a server-executed Agent tool for listing recent public Halo resources.

#### Scenario: Latest resources returns posts at minimum
- **WHEN** the model calls `get_latest_halo_resources`
- **THEN** the backend MUST return recent public posts at minimum
- **AND** it MUST include trusted resource metadata and permalinks for frontend navigation

#### Scenario: Latest resources respects type configuration
- **WHEN** the site owner configures additional supported latest resource types
- **THEN** the backend MUST include only supported and allowed public types in the latest resource result

### Requirement: Halo taxonomy and page tools SHALL use structured backend queries
The plugin SHALL provide server-executed tools for categories, tags, pages, and resource lists associated with taxonomies.

#### Scenario: Categories and tags return navigable resources
- **WHEN** the model requests categories or tags
- **THEN** the backend MUST return structured public taxonomy resources with names and permalinks where available
- **AND** those resources MUST be eligible for trusted frontend navigation

#### Scenario: Posts by taxonomy return public post resources
- **WHEN** the model requests posts by a category or tag
- **THEN** the backend MUST return only public, published, non-recycled posts in that taxonomy
- **AND** it MUST include bounded metadata for model responses and frontend navigation

#### Scenario: Pages are searchable and navigable
- **WHEN** the model requests public pages or searches pages
- **THEN** the backend MUST return public page resources with titles and permalinks
- **AND** those resources MUST be eligible for trusted frontend navigation

### Requirement: Halo comment capability SHALL support configurable assistance levels
The plugin SHALL provide Halo comment Agent capabilities according to the site owner's selected comment level.

#### Scenario: Comment capability disabled
- **WHEN** the comment capability is `off`
- **THEN** no comment tools MUST be declared to the model

#### Scenario: Comment assist capability
- **WHEN** the comment capability is `assist`
- **THEN** the plugin MAY declare tools to open the comment area, read public comments where available, and draft comment content
- **AND** it MUST NOT submit comments automatically

#### Scenario: Comment submit capability
- **WHEN** the comment capability is `submit`
- **THEN** the plugin MAY declare a comment submission tool only when the site policy supports it
- **AND** each submission MUST require visitor approval
- **AND** the tool MUST respect Halo comment authentication, captcha, moderation, and validation requirements

#### Scenario: Comment flow requires visitor completion
- **WHEN** a required comment precondition such as login, captcha, profile fields, or moderation cannot be satisfied by the tool
- **THEN** the tool MUST return a structured result telling the model that the visitor must complete the site comment flow manually
