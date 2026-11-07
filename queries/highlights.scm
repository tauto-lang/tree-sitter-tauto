; Comments and literals

(line_comment) @comment
(block_comment) @comment

(string) @string
(escape_sequence) @string.escape
(syntax_literal) @string.special
(number) @number
(boolean) @boolean
(hole) @variable.special
(box_hole) @variable.special

; Declarations

(function_declaration name: (identifier) @function)
(extern_function name: (identifier) @function)
(law_declaration name: (identifier) @function)
(theorem_declaration name: (identifier) @function)
(axiom_declaration name: (identifier) @function)
(def_declaration name: (identifier) @type)
(inductive_declaration name: (identifier) @type)
(struct_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(class_declaration name: (identifier) @type)
(effect_declaration name: (identifier) @function)
(extern_type name: (identifier) @type)
(module_declaration name: (identifier) @module)
(constructor name: (identifier) @constructor)
(variant name: (identifier) @constructor)
(generated name: (identifier) @function)

(field_declaration name: (identifier) @property)
(field_initializer field: (identifier) @property)
(field_pattern field: (identifier) @property)
(field_expression field: (identifier) @property)

(parameter name: (identifier) @variable.parameter)
(generic name: (identifier) @type)
(type_parameter name: (identifier) @type)
(constraint class: (identifier) @type)
(instance_declaration class: (identifier) @type)
(extern_instance class: (identifier) @type)

; Uses

(call_expression function: (identifier) @function)
(perform_expression operation: (identifier) @function)
(operation_handler operation: (identifier) @function)
(effect_name name: (identifier) @type)
(macro_name) @function.macro
(tag (identifier) @attribute)
(tag "@" @attribute)
(attribute "@" @attribute)

; A name that begins with a capital letter is a type or a constructor.
((identifier) @type
  (#match? @type "^([a-z_][a-zA-Z0-9_]*::)*[A-Z]"))

(identifier) @variable

; Keywords

[
  "fn" "theorem" "axiom" "def" "inductive" "struct" "enum" "effect" "class" "instance"
  "module" "extern" "type" "import" "mutual" "macro" "let" "var" "opaque"
] @keyword

[
  "if" "else" "match" "while" "loop" "return" "break" "handle" "with" "perform"
  "resume" "direct" "ω" "\\omega" "budget" "decreasing_by" "where" "eqn" "by" "calc" "from" "quote" "replace"
] @keyword

[
  "pub" "pub(open)" "mut" "copy" "shared" "view" "affine" "linear"
] @keyword

[
  "∀" "\\forall" "∃" "\\exists"
] @keyword

; Operators and punctuation

[
  "+" "-" "*" "/" "=" "==" "!=" "<" "<=" ">" ">=" "&&" "||" "|" "&" "!" ":=" "->" "=>" ".."
  "¬" "\\neg" "∧" "\\land" "∨" "\\lor" "×" "\\times" "↔" "\\iff" "∪" "\\cup" "⊢" "\\vdash"
] @operator

["(" ")" "[" "]" "{" "}" "#(" "#{" "⟦" "⟧" "\\llbracket" "\\rrbracket"] @punctuation.bracket
["," ";" ":" "."] @punctuation.delimiter
(continue_statement) @keyword
