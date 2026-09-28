//! Turing machine lab for Lesson 1.11.
//!
//! The simulator's "program" is a plain-text rule table, read at run time.
//! That makes the simulator a small universal machine: one fixed program
//! that carries out whatever machine its input describes. It runs a binary
//! incrementer, then a machine that never halts, under a step budget.

use std::collections::{BTreeMap, HashMap};
use std::error::Error;
use std::fmt;

const BLANK: char = '_';

/// Adds one to a binary number. Start on the rightmost digit in `carry`.
const INCREMENTER: &str = "\
carry 1 -> 0 L carry   # 1 plus a carry is 0, and the carry moves left
carry 0 -> 1 S done    # 0 plus a carry is 1, and the carry is used up
carry _ -> 1 S done    # ran off the left end: write a new leading 1
";

/// Writes 1s to the right forever. This machine never halts.
const FILLER: &str = "\
fill _ -> 1 R fill
";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Move {
    Left,
    Right,
    Stay,
}

impl Move {
    fn delta(self) -> i64 {
        match self {
            Move::Left => -1,
            Move::Right => 1,
            Move::Stay => 0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Rule {
    write: char,
    movement: Move,
    next: usize,
}

/// A machine is nothing but a rule table. States are stored as numbers;
/// their names exist only so people can read the table and the output.
#[derive(Debug)]
struct Machine {
    state_names: Vec<String>,
    rules: HashMap<(usize, char), Rule>,
}

#[derive(Debug, PartialEq, Eq)]
enum ParseError {
    WrongFieldCount { line: usize },
    BadSymbol { line: usize },
    BadMove { line: usize },
    DuplicateRule { line: usize },
}

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::WrongFieldCount { line } => {
                write!(
                    formatter,
                    "line {line}: expected `state read -> write move next`"
                )
            }
            ParseError::BadSymbol { line } => {
                write!(
                    formatter,
                    "line {line}: a symbol must be exactly one character"
                )
            }
            ParseError::BadMove { line } => {
                write!(formatter, "line {line}: the move must be L, R, or S")
            }
            ParseError::DuplicateRule { line } => {
                write!(
                    formatter,
                    "line {line}: a rule for this state and symbol already exists"
                )
            }
        }
    }
}

impl Error for ParseError {}

impl Machine {
    /// Parses lines of the form `state read -> write move next`, where `move`
    /// is `L`, `R`, or `S` (stay). Text after `#` is a comment.
    fn parse(source: &str) -> Result<Self, ParseError> {
        let mut machine = Machine {
            state_names: Vec::new(),
            rules: HashMap::new(),
        };

        for (index, raw_line) in source.lines().enumerate() {
            let line = index + 1;
            let text = raw_line.split('#').next().unwrap_or_default().trim();
            if text.is_empty() {
                continue;
            }

            let fields: Vec<&str> = text.split_whitespace().collect();
            let [state, read, arrow, write, movement, next] = fields.as_slice() else {
                return Err(ParseError::WrongFieldCount { line });
            };
            if *arrow != "->" {
                return Err(ParseError::WrongFieldCount { line });
            }

            let read = single_symbol(read).ok_or(ParseError::BadSymbol { line })?;
            let write = single_symbol(write).ok_or(ParseError::BadSymbol { line })?;
            let movement = match *movement {
                "L" => Move::Left,
                "R" => Move::Right,
                "S" => Move::Stay,
                _ => return Err(ParseError::BadMove { line }),
            };

            let state = machine.state_id(state);
            let next = machine.state_id(next);
            let rule = Rule {
                write,
                movement,
                next,
            };
            if machine.rules.insert((state, read), rule).is_some() {
                return Err(ParseError::DuplicateRule { line });
            }
        }

        Ok(machine)
    }

    fn state_id(&mut self, name: &str) -> usize {
        if let Some(id) = self.find_state(name) {
            return id;
        }
        self.state_names.push(name.to_owned());
        self.state_names.len() - 1
    }

    fn find_state(&self, name: &str) -> Option<usize> {
        self.state_names.iter().position(|known| known == name)
    }

    fn name(&self, state: usize) -> &str {
        &self.state_names[state]
    }
}

fn single_symbol(text: &str) -> Option<char> {
    let mut symbols = text.chars();
    let symbol = symbols.next()?;
    symbols.next().is_none().then_some(symbol)
}

/// An unbounded tape. Only non-blank cells are stored, so the tape can grow
/// in either direction without shifting anything.
#[derive(Debug, Default)]
struct Tape {
    cells: BTreeMap<i64, char>,
}

impl Tape {
    fn with_contents(text: &str) -> Self {
        let mut tape = Tape::default();
        for (position, symbol) in (0_i64..).zip(text.chars()) {
            tape.write(position, symbol);
        }
        tape
    }

    fn read(&self, position: i64) -> char {
        self.cells.get(&position).copied().unwrap_or(BLANK)
    }

    fn write(&mut self, position: i64, symbol: char) {
        if symbol == BLANK {
            self.cells.remove(&position);
        } else {
            self.cells.insert(position, symbol);
        }
    }

    /// The stretch of tape from the first to the last non-blank cell.
    fn contents(&self) -> String {
        let (Some((&first, _)), Some((&last, _))) =
            (self.cells.first_key_value(), self.cells.last_key_value())
        else {
            return String::new();
        };
        (first..=last).map(|position| self.read(position)).collect()
    }
}

#[derive(Debug, PartialEq, Eq)]
enum Outcome {
    Halted { state: usize, steps: u64 },
    OutOfBudget { steps: u64 },
}

/// Runs until no rule matches (the machine halts) or the budget is spent.
///
/// The budget is not optional. No simulator can know in advance whether an
/// arbitrary machine will ever halt, so all it can decide is how long it is
/// willing to wait.
fn run(machine: &Machine, tape: &mut Tape, head: i64, state: usize, budget: u64) -> Outcome {
    let mut head = head;
    let mut state = state;
    let mut steps = 0;
    loop {
        let Some(rule) = machine.rules.get(&(state, tape.read(head))) else {
            return Outcome::Halted { state, steps };
        };
        if steps == budget {
            return Outcome::OutOfBudget { steps };
        }
        tape.write(head, rule.write);
        head += rule.movement.delta();
        state = rule.next;
        steps += 1;
    }
}

fn describe(machine: &Machine, outcome: &Outcome) -> String {
    match outcome {
        Outcome::Halted { state, steps } => {
            format!("halted in `{}` after {steps} steps", machine.name(*state))
        }
        Outcome::OutOfBudget { steps } => format!("still running after {steps} steps, gave up"),
    }
}

fn main() -> Result<(), Box<dyn Error>> {
    println!("1. A three-rule program that adds one to a binary number");
    let incrementer = Machine::parse(INCREMENTER)?;
    let carry = incrementer
        .find_state("carry")
        .ok_or("the incrementer has no `carry` state")?;

    for number in ["1011", "111", "0"] {
        let mut tape = Tape::with_contents(number);
        let rightmost = i64::try_from(number.len())? - 1;
        let outcome = run(&incrementer, &mut tape, rightmost, carry, 100);
        let result = tape.contents();
        let before = u64::from_str_radix(number, 2)?;
        let after = u64::from_str_radix(&result, 2)?;
        println!(
            "  {number:>4} ({before:>2}) -> {result:>4} ({after:>2})   {}",
            describe(&incrementer, &outcome)
        );
    }

    println!("\n2. A machine that never halts, stopped by a budget");
    let filler = Machine::parse(FILLER)?;
    let fill = filler
        .find_state("fill")
        .ok_or("the filler has no `fill` state")?;
    let mut tape = Tape::default();
    let outcome = run(&filler, &mut tape, 0, fill, 1_000);
    println!(
        "  {}; the tape now holds {} symbols",
        describe(&filler, &outcome),
        tape.contents().len()
    );

    println!("\n3. The program is data: a malformed table is rejected, not run");
    match Machine::parse("carry 1 -> 0 X carry") {
        Ok(_) => println!("  unexpectedly accepted"),
        Err(error) => println!("  rejected: {error}"),
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn increment(number: &str, budget: u64) -> (String, Outcome) {
        let machine = Machine::parse(INCREMENTER).unwrap();
        let carry = machine.find_state("carry").unwrap();
        let mut tape = Tape::with_contents(number);
        let rightmost = i64::try_from(number.len()).unwrap() - 1;
        let outcome = run(&machine, &mut tape, rightmost, carry, budget);
        (tape.contents(), outcome)
    }

    #[test]
    fn incrementer_adds_one_to_every_small_number() {
        for value in 0_u64..=64 {
            let (result, outcome) = increment(&format!("{value:b}"), 100);
            assert!(
                matches!(outcome, Outcome::Halted { .. }),
                "{value}: {outcome:?}"
            );
            assert_eq!(u64::from_str_radix(&result, 2).unwrap(), value + 1);
        }
    }

    #[test]
    fn carry_can_run_off_the_left_end() {
        let (result, outcome) = increment("111", 100);
        assert_eq!(result, "1000");
        assert!(matches!(outcome, Outcome::Halted { steps: 4, .. }));
    }

    #[test]
    fn halting_on_the_last_budgeted_step_still_counts_as_halting() {
        let (result, outcome) = increment("1011", 3);
        assert_eq!(result, "1100");
        assert!(matches!(outcome, Outcome::Halted { steps: 3, .. }));
    }

    #[test]
    fn a_machine_that_never_halts_runs_out_of_budget() {
        let machine = Machine::parse(FILLER).unwrap();
        let fill = machine.find_state("fill").unwrap();
        let mut tape = Tape::default();
        assert_eq!(
            run(&machine, &mut tape, 0, fill, 50),
            Outcome::OutOfBudget { steps: 50 }
        );
        assert_eq!(tape.contents(), "1".repeat(50));
    }

    #[test]
    fn malformed_rules_are_rejected_with_their_line() {
        assert_eq!(
            Machine::parse("a 1 0 L b").unwrap_err(),
            ParseError::WrongFieldCount { line: 1 }
        );
        assert_eq!(
            Machine::parse("a 1 -> 0 X b").unwrap_err(),
            ParseError::BadMove { line: 1 }
        );
        assert_eq!(
            Machine::parse("a 10 -> 0 L b").unwrap_err(),
            ParseError::BadSymbol { line: 1 }
        );
        assert_eq!(
            Machine::parse("a 1 -> 0 L b\na 1 -> 1 R b").unwrap_err(),
            ParseError::DuplicateRule { line: 2 }
        );
    }
}
