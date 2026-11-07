/**
 * @file Tauto grammar for tree-sitter
 * @license MIT OR Apache-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Precedence, from the loosest to the tightest. It follows the reader of the compiler: a lambda,
// then `↔`, `->`, `∨ |`, `∧ ×`, `¬`, `=`, `||`, `&&`, comparisons, `+ -`, `* /`, prefix operators,
// and a call or a field binds tightest.
const PREC = {
  lambda: 1,
  iff: 2,
  arrow: 3,
  or: 4,
  and: 5,
  not: 6,
  eq: 7,
  oror: 8,
  andand: 9,
  compare: 10,
  additive: 11,
  multiplicative: 12,
  prefix: 13,
  postfix: 14,
};

const IDENT = /[\p{L}_][\p{L}\p{N}_]*/;

const sepBy1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));
const sepBy = (sep, rule) => optional(sepBy1(sep, rule));
// Members of a `{ … }` end with a comma or a newline; newlines are skipped, so only the comma is written.
const members = (rule) => seq(sepBy(optional(','), rule), optional(','));
const commaList = (rule) => seq(sepBy(',', rule), optional(','));

// The operators of a sequence of operands, `a + b`, `A -> B`, `P ∧ Q`.
const binaryOps = () => [
  [PREC.iff, choice('↔', '\\iff'), prec.left],
  [PREC.arrow, '->', prec.right],
  [PREC.or, choice('∨', '\\lor', '|'), prec.right],
  [PREC.and, choice('∧', '\\land', '×', '\\times'), prec.right],
  [PREC.eq, '=', prec.left],
  [PREC.oror, '||', prec.left],
  [PREC.andand, '&&', prec.left],
  [PREC.compare, choice('==', '!=', '<', '<=', '>', '>='), prec.left],
  [PREC.additive, choice('+', '-'), prec.left],
  [PREC.multiplicative, choice('*', '/'), prec.left],
];

module.exports = grammar({
  name: 'tauto',

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.where_clause],
    [$._primary, $.struct_expression],
  ],

  rules: {
    source_file: ($) => repeat($._statement_item),

    _statement_item: ($) => choice($._statement, ';'),

    _statement: ($) =>
      choice(
        $._declaration,
        $.let_statement,
        $.var_statement,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.while_statement,
        $.expression_statement,
      ),

    _declaration: ($) =>
      seq(
        optional($.attribute),
        optional($.visibility),
        choice(
          $.function_declaration,
          $.macro_function_declaration,
          $.struct_declaration,
          $.enum_declaration,
          $.effect_declaration,
          $.theorem_declaration,
          $.axiom_declaration,
          $.inductive_declaration,
          $.def_declaration,
          $.import_declaration,
          $.mutual_declaration,
          $.extern_declaration,
          $.class_declaration,
          $.instance_declaration,
          $.module_declaration,
        ),
      ),

    visibility: (_) => choice('pub', 'pub(open)'),

    // `@mode!(…) => inductive Inferred, fn infer` on the line before a declaration.
    attribute: ($) => seq('@', $.macro_call, optional($.generates)),

    generates: ($) =>
      seq('=>', optional(field('target', 'replace')), sepBy1(',', $.generated)),
    generated: ($) =>
      seq(
        field('kind', choice('fn', 'theorem', 'def', 'inductive', 'struct', 'enum')),
        field('name', $.identifier),
      ),

    let_statement: ($) =>
      seq(
        'let',
        optional($.borrow),
        field('name', $.identifier),
        optional(seq(':', field('type', $._expression))),
        ':=',
        field('value', $._expression),
      ),
    var_statement: ($) =>
      seq(
        'var',
        optional('&'),
        field('name', $.identifier),
        optional(seq(':', field('type', $._expression))),
        ':=',
        field('value', $._expression),
      ),
    return_statement: ($) => prec.right(seq('return', optional($._expression))),
    break_statement: ($) => prec.right(seq('break', optional($._expression))),
    continue_statement: (_) => 'continue',
    while_statement: ($) =>
      seq('while', field('condition', $._cond_expression), field('body', $.block)),
    expression_statement: ($) =>
      prec.right(seq($._expression, optional(seq(':=', $._expression)))),

    // Declarations.

    function_declaration: ($) =>
      seq(
        optional('opaque'),
        'fn',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        optional($._fn_result),
        optional($.where_clause),
        optional($.budget_clause),
        optional($.decreasing_by),
        optional($.generates),
        field('body', $.block),
      ),
    macro_function_declaration: ($) => seq('macro', $.function_declaration),

    theorem_declaration: ($) =>
      seq(
        'theorem',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        ':',
        field('type', $._body_type),
        optional($.where_clause),
        optional($.budget_clause),
        optional($.decreasing_by),
        field('body', $.block),
      ),

    axiom_declaration: ($) =>
      seq(
        'axiom',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        ':',
        field('type', $._expression),
      ),

    def_declaration: ($) =>
      seq(
        'def',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        ':',
        field('type', $._expression),
        optional($.budget_clause),
        ':=',
        field('value', $._expression),
      ),

    inductive_declaration: ($) =>
      seq(
        'inductive',
        field('name', $.identifier),
        optional(field('parameters', $.parameters)),
        ':',
        field('type', $._body_type),
        optional($.generates),
        '{',
        members($.constructor),
        '}',
      ),
    constructor: ($) =>
      seq(
        field('name', choice($.identifier, $.boolean)),
        optional($.generics),
        optional(field('parameters', $.parameters)),
        ':',
        field('type', $._expression),
      ),

    struct_declaration: ($) =>
      seq(
        optional($._data_kind),
        'struct',
        field('name', $.identifier),
        optional($.type_parameters),
        $.field_declaration_list,
      ),
    field_declaration_list: ($) => seq('{', members($.field_declaration), '}'),
    field_declaration: ($) =>
      seq(field('name', $.identifier), ':', field('type', $._expression)),

    enum_declaration: ($) =>
      seq(
        optional($._data_kind),
        'enum',
        field('name', $.identifier),
        optional($.type_parameters),
        '{',
        members($.variant),
        '}',
      ),
    variant: ($) =>
      seq(
        field('name', $.identifier),
        optional(
          choice(
            seq('(', commaList($._expression), ')'),
            $.field_declaration_list,
          ),
        ),
      ),

    _data_kind: ($) => choice($.kind, 'inductive'),
    kind: (_) => choice('copy', 'shared', 'view', 'affine', 'linear'),

    effect_declaration: ($) =>
      seq(
        'effect',
        field('name', $.identifier),
        optional($.generics),
        optional(field('parameters', $.parameters)),
        choice(
          seq(':', field('type', $._expression), optional($.effect_mode)),
          seq('{', commaList($.effect_name), '}'),
        ),
      ),
    effect_mode: ($) =>
      choice(
        seq('resume', choice($.number, seq('<=', $.number), choice('ω', '\\omega'))),
        'direct',
      ),

    import_declaration: ($) => seq('import', choice($.string, $.identifier)),

    mutual_declaration: ($) =>
      seq(
        'mutual',
        '{',
        members(
          seq(
            optional($.visibility),
            choice($.inductive_declaration, $.function_declaration, $.theorem_declaration),
          ),
        ),
        '}',
      ),

    extern_declaration: ($) =>
      seq('extern', '{', members(choice($.extern_function, $.extern_instance, $.extern_type)), '}'),
    extern_function: ($) =>
      seq(
        'fn',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        optional($._fn_result),
        optional($.where_clause),
      ),
    extern_instance: ($) =>
      seq('instance', field('class', $.identifier), '(', field('type', $._expression), ')'),
    extern_type: ($) => seq(optional($.kind), 'type', field('name', $.identifier)),

    class_declaration: ($) =>
      seq(
        'class',
        field('name', $.identifier),
        $.type_parameters,
        '{',
        members(choice($.extern_function, $.law_declaration)),
        '}',
      ),
    law_declaration: ($) =>
      seq(
        'theorem',
        field('name', $.identifier),
        optional($.generics),
        field('parameters', $.parameters),
        ':',
        field('type', $._body_type),
        optional(field('body', $.block)),
      ),

    instance_declaration: ($) =>
      seq(
        'instance',
        optional($.generics),
        field('class', $.identifier),
        '(',
        field('type', $._expression),
        ')',
        optional($.where_clause),
        '{',
        members(choice($.function_declaration, $.law_declaration)),
        '}',
      ),

    module_declaration: ($) => seq('module', field('name', $.identifier), field('body', $.block)),

    parameters: ($) => seq('(', commaList($.parameter), ')'),
    parameter: ($) =>
      seq(
        optional($.borrow),
        field('name', $.identifier),
        optional(seq(':', field('type', $._expression))),
      ),
    borrow: (_) => prec.right(seq('&', optional('mut'))),

    generics: ($) => seq('<', commaList($.generic), '>'),
    generic: ($) =>
      choice(
        seq('!', field('name', $.identifier), optional(seq(':', $._row_bound))),
        seq(field('name', $.identifier), optional(seq(':', field('kind', $._angle_type)))),
      ),
    _row_bound: ($) => choice(seq('<=', $.number), 'direct', $.identifier),
    _angle_type: ($) =>
      prec.right(seq($._postfix_operand, optional(seq('->', $._angle_type)))),

    type_parameters: ($) => seq('(', commaList($.type_parameter), ')'),
    type_parameter: ($) =>
      choice(
        seq('!', field('name', $.identifier), optional(seq(':', $._row_bound))),
        seq(field('name', $.identifier), ':', field('kind', $._angle_type)),
      ),

    _fn_result: ($) => choice(seq(':', field('result', $._body_type)), $.effect_row),
    where_clause: ($) => seq('where', sepBy1(',', $.constraint)),
    constraint: ($) => seq(field('class', $.identifier), '(', $._expression, ')'),
    budget_clause: ($) => seq('budget', $.number),
    decreasing_by: ($) => seq('decreasing_by', $._cond_expression),

    effect_row: ($) => prec.right(seq('!', sepBy1(choice('∪', '\\cup'), $._effect_term))),
    _effect_term: ($) => choice($.effect_set, $.identifier),
    effect_set: ($) => seq('{', commaList($.effect_name), '}'),
    effect_name: ($) =>
      seq(optional($.effect_forall), field('name', $.identifier), optional($.arguments)),
    effect_forall: ($) => seq($._forall, sepBy1(',', $.identifier), $._qdot),

    // Expressions and types are one grammar. `_cond_expression` is the form that stands before a
    // block (after `if`, `while`, `match`, …): it has no struct literal, so a name is followed by the
    // block. `_body_type` is the same for a type that is followed by a body or by `from`.

    _expression: ($) => choice($._binary_expression, $.lambda_expression),

    lambda_expression: ($) =>
      prec.right(
        PREC.lambda,
        seq(field('parameters', $._binary_expression), '=>', field('body', choice($._expression, sepBy1(',', $.generated)))),
      ),

    _binary_expression: ($) =>
      choice($.binary_expression, $._prefix_operand, $.effect_typed_expression),

    effect_typed_expression: ($) =>
      prec.right(PREC.arrow, seq($._binary_expression, $.effect_row)),

    binary_expression: ($) =>
      choice(
        ...binaryOps().map(([p, op, assoc]) =>
          assoc(
            p,
            seq(
              field('left', $._binary_expression),
              field('operator', op),
              field('right', $._binary_expression),
            ),
          ),
        ),
      ),

    _prefix_operand: ($) => choice($.unary_expression, $.quantified_expression, $._postfix_operand),

    unary_expression: ($) =>
      choice(
        prec(PREC.prefix, seq(field('operator', choice('-', '+')), $._prefix_operand)),
        prec(PREC.prefix, seq($.borrow, $._prefix_operand)),
        prec(PREC.prefix, seq($.tag, $._prefix_operand)),
        prec(PREC.prefix, seq($.kind, $._prefix_operand)),
        prec(PREC.not, seq(field('operator', choice('¬', '\\neg')), $._binary_expression)),
      ),

    tag: ($) => seq('@', $.identifier),

    quantified_expression: ($) =>
      prec.right(
        seq(
          field('quantifier', choice($._forall, choice('∃', '\\exists'))),
          sepBy1(',', seq(field('variable', $.identifier), ':', field('type', $._expression))),
          $._qdot,
          field('body', $._expression),
        ),
      ),

    _postfix_operand: ($) =>
      choice($.call_expression, $.field_expression, $._primary, $.struct_expression),

    call_expression: ($) =>
      prec(PREC.postfix, seq(field('function', $._postfix_operand), field('arguments', $.arguments))),
    field_expression: ($) =>
      prec(PREC.postfix, seq(field('value', $._postfix_operand), '.', field('field', $.identifier))),
    arguments: ($) => seq('(', commaList(choice($.item, $.effect_row)), ')'),
    item: ($) => seq($._expression, optional(seq(':', $._expression))),

    struct_expression: ($) => seq(field('name', $.identifier), $.field_initializer_list),
    field_initializer_list: ($) =>
      seq('{', members(choice($.field_initializer, $.base_field_initializer)), '}'),
    field_initializer: ($) => seq(field('field', $.identifier), ':', field('value', $._expression)),
    base_field_initializer: ($) => seq('..', $._expression),
    anonymous_record: ($) => seq('#{', members($.field_initializer), '}'),

    // The conditional forms: the same operators over operands without a struct literal.
    _cond_expression: ($) => choice(alias($.cond_binary_expression, $.binary_expression), $._cond_prefix_operand),
    cond_binary_expression: ($) =>
      choice(
        ...binaryOps()
          .filter(([p]) => p !== PREC.arrow)
          .map(([p, op, assoc]) =>
            assoc(
              p,
              seq(
                field('left', $._cond_expression),
                field('operator', op),
                field('right', $._cond_expression),
              ),
            ),
          ),
      ),
    _cond_prefix_operand: ($) =>
      choice(
        alias($.cond_unary_expression, $.unary_expression),
        alias($.cond_quantified_expression, $.quantified_expression),
        $._cond_postfix_operand,
      ),
    cond_quantified_expression: ($) =>
      prec.right(
        seq(
          field('quantifier', choice($._forall, choice('∃', '\\exists'))),
          sepBy1(',', seq(field('variable', $.identifier), ':', field('type', $._expression))),
          $._qdot,
          field('body', $._body_type),
        ),
      ),
    cond_unary_expression: ($) =>
      choice(
        prec(PREC.prefix, seq(field('operator', choice('-', '+')), $._cond_prefix_operand)),
        prec(PREC.prefix, seq($.borrow, $._cond_prefix_operand)),
        prec(PREC.prefix, seq($.tag, $._cond_prefix_operand)),
        prec(PREC.prefix, seq($.kind, $._cond_prefix_operand)),
        prec(PREC.not, seq(field('operator', choice('¬', '\\neg')), $._cond_expression)),
      ),
    _cond_postfix_operand: ($) =>
      choice(
        alias($.cond_call_expression, $.call_expression),
        alias($.cond_field_expression, $.field_expression),
        $._primary,
      ),
    cond_call_expression: ($) =>
      prec(PREC.postfix, seq(field('function', $._cond_postfix_operand), field('arguments', $.arguments))),
    cond_field_expression: ($) =>
      prec(PREC.postfix, seq(field('value', $._cond_postfix_operand), '.', field('field', $.identifier))),

    _body_type: ($) =>
      choice(
        $._cond_expression,
        alias($.body_arrow_expression, $.binary_expression),
        alias($.body_effect_typed_expression, $.effect_typed_expression),
      ),
    body_arrow_expression: ($) =>
      prec.right(PREC.arrow, seq(field('left', $._body_type), field('operator', '->'), field('right', $._body_type))),
    body_effect_typed_expression: ($) => prec.right(PREC.arrow, seq($._body_type, $.effect_row)),

    _primary: ($) =>
      choice(
        $.number,
        $.string,
        $.boolean,
        $.identifier,
        $.parenthesized_expression,
        $.block,
        $.anonymous_record,
        $.tuple_expression,
        $.list_expression,
        $.if_expression,
        $.match_expression,
        $.loop_expression,
        $.perform_expression,
        $.handle_expression,
        $.budget_expression,
        $.hole,
        $.syntax_literal,
        $.macro_call,
        $.quote_expression,
        $.splice_expression,
        $.step_expression,
        $.calc_expression,
        $.congruence_expression,
        $.box_hole,
      ),

    parenthesized_expression: ($) => seq('(', commaList($.item), ')'),
    tuple_expression: ($) => seq('#(', commaList($.item), ')'),
    list_expression: ($) => seq('[', commaList($._expression), ']'),
    block: ($) => seq('{', repeat($._statement_item), '}'),

    if_expression: ($) =>
      prec.right(
        seq(
          'if',
          field('condition', $._cond_expression),
          field('consequence', $.block),
          optional(seq('else', field('alternative', choice($.if_expression, $.block)))),
        ),
      ),
    loop_expression: ($) => seq('loop', $.block),

    match_expression: ($) =>
      seq(
        'match',
        field('value', $._cond_expression),
        optional(seq('eqn', field('equation', $.identifier))),
        optional(seq(':', field('type', $._body_type))),
        '{',
        members($.match_arm),
        '}',
      ),
    match_arm: ($) =>
      prec.right(
        seq(
          field('pattern', $._pattern),
          optional(seq('if', field('guard', $._cond_expression))),
          // `=> value` is optional so that an arm being typed (e.g. `[]` before `=>`) stays inside the
          // match block instead of closing it early; otherwise editors compute the wrong indentation.
          optional(seq('=>', field('value', choice($.goal, $._expression)))),
        ),
      ),
    goal: ($) =>
      prec.right(seq(choice('⊢', '\\vdash'), field('type', $._body_type), 'from', field('proof', $._expression))),

    perform_expression: ($) =>
      seq('perform', field('operation', $.identifier), field('arguments', $.arguments)),

    handle_expression: ($) => prec.right(seq('handle', $.block, repeat1($.handler_clause))),
    handler_clause: ($) =>
      seq('with', '{', members(choice($.operation_handler, $.return_handler)), '}'),
    operation_handler: ($) =>
      prec.right(
        seq(
          optional($.effect_forall),
          field('operation', $.identifier),
          optional(seq('<', commaList($._angle_type), '>')),
          '(',
          commaList($._pattern),
          ')',
          optional(seq(',', field('continuation', $.identifier))),
          optional(seq('if', field('guard', $._cond_expression))),
          '=>',
          field('value', $._expression),
        ),
      ),
    return_handler: ($) =>
      prec.right(seq('return', field('pattern', $._pattern), '=>', field('value', $._expression))),

    budget_expression: ($) =>
      seq('budget', '(', commaList(seq($.identifier, ':', $._expression)), ')', $.block),

    step_expression: ($) =>
      seq(
        'by',
        field('tactic', $.macro_call),
        optional(seq(':', field('type', $._body_type))),
        '{',
        members($.step_arm),
        '}',
      ),
    step_arm: ($) =>
      prec.right(
        seq(
          sepBy(',', seq($.identifier, ':', $._expression)),
          choice('⊢', '\\vdash'),
          field('type', $._body_type),
          'from',
          field('proof', $._expression),
        ),
      ),

    calc_expression: ($) =>
      seq('calc', $._cond_expression, '{', members($.calc_step), '}'),
    calc_step: ($) =>
      prec.right(seq(choice('=', '↔', '\\iff'), $._expression, 'from', $._prefix_operand)),

    congruence_expression: ($) =>
      seq(choice('⟦', '\\llbracket'), $._expression, choice('⟧', '\\rrbracket')),
    box_hole: (_) => choice('□', '\\square'),

    quote_expression: ($) => seq('quote', optional($.identifier), $.block),
    splice_expression: ($) => seq(alias(token(prec(1, '$(')), '$('), $._expression, ')'),

    macro_call: ($) =>
      seq(field('macro', $.macro_name), '(', commaList($.item), ')'),
    macro_name: (_) => token(seq(IDENT, '!')),

    // Patterns.

    _pattern: ($) => choice($.or_pattern, $._pattern_alt),
    or_pattern: ($) => prec.left(seq($._pattern, '|', $._pattern_alt)),
    _pattern_alt: ($) =>
      choice($.pattern_path, $.literal_pattern, $.tuple_pattern, $.list_pattern, $.label_pattern),
    label_pattern: ($) => seq($.tag, $._pattern_alt),
    // `[x, y, ..rest]` and `[]`: the rest, only last, is a name or `_`.
    list_pattern: ($) =>
      seq(
        '[',
        optional(choice($.list_pattern_rest, seq(sepBy1(',', $._pattern), optional(seq(',', $.list_pattern_rest))))),
        ']',
      ),
    list_pattern_rest: ($) => seq('..', $.identifier),
    tuple_pattern: ($) => seq('#(', commaList($._pattern), ')'),
    pattern_path: ($) =>
      prec.right(
        seq(
          field('name', $.identifier),
          optional(seq('<', commaList(seq($.identifier, ':', $._pattern)), '>')),
          optional(
            choice(
              seq('(', commaList($._pattern), ')'),
              seq('{', members($.field_pattern), '}'),
            ),
          ),
        ),
      ),
    field_pattern: ($) => seq(field('field', $.identifier), optional(seq(':', $._pattern))),
    literal_pattern: ($) => choice(seq(optional('-'), $.number), $.string, $.boolean),

    // Tokens.

    _forall: (_) => choice('∀', '\\forall'),
    // The `.` that ends a quantifier's binder is followed by a space or a line end.
    _qdot: (_) => token(seq('.', /[ \t\r\n]/)),

    hole: (_) => token(seq('?', IDENT)),

    number: (_) =>
      token(
        choice(
          /[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+/,
          /[0-9]+\.[0-9]+/,
          /[0-9]+(_[0-9]+)*/,
        ),
      ),
    boolean: (_) => choice('true', 'false'),

    string: ($) =>
      choice(
        seq('"', repeat(choice($.string_content, $.escape_sequence)), '"'),
        token(seq("'", /[^']*/, "'")),
        token(seq('plaintext`', /[^`\r\n]*/, '`')),
      ),
    string_content: (_) => token.immediate(prec(1, /[^"\\]+/)),
    escape_sequence: (_) => token.immediate(choice(/\\[\\"'nrt0]/, /\\u\{[0-9a-fA-F]{1,6}\}/)),

    // Syntax literals: name`…`, name<`…`> (also <<`…`>> and <<<`…`>>>), and a block of three or
    // more backticks.
    syntax_literal: (_) =>
      token(
        choice(
          seq(optional(IDENT), '`', /[^`\r\n]*/, '`'),
          seq(optional(IDENT), '<`', repeat(choice(/[^`]/, /`+[^`>]/)), /`+>/),
          seq(optional(IDENT), '<<`', repeat(choice(/[^`]/, /`+[^`>]/, /`+>[^>]/)), /`+>>/),
          seq(optional(IDENT), '<<<`', repeat(choice(/[^`]/, /`+[^`>]/, /`+>[^>]/, /`+>>[^>]/)), /`+>>>/),
          seq('``````', /[^`\r\n]*\r?\n/, repeat(choice(/[^`]/, /`{1,5}[^`]/)), '``````'),
          seq('`````', /[^`\r\n]*\r?\n/, repeat(choice(/[^`]/, /`{1,4}[^`]/)), '`````'),
          seq('````', /[^`\r\n]*\r?\n/, repeat(choice(/[^`]/, /`{1,3}[^`]/)), '````'),
          seq('```', /[^`\r\n]*\r?\n/, repeat(choice(/[^`]/, /`{1,2}[^`]/)), '```'),
        ),
      ),

    // A name is a path of names joined by `::`, one token. `r#name` is a name spelled like a
    // reserved word; `$x` and `$xs...` are filled in by a quote.
    identifier: (_) =>
      token(
        choice(
          seq('$', IDENT, '...'),
          seq(optional('$'), IDENT, repeat(seq('::', IDENT))),
          seq('r#', IDENT),
        ),
      ),

    line_comment: (_) => token(seq('//', /[^\r\n]*/)),
    block_comment: (_) => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
  },
});
