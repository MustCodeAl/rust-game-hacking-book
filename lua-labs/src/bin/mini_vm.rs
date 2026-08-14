use std::{error::Error, fmt};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Value {
    Integer(i64),
    Boolean(bool),
}

#[derive(Debug, Clone, Copy)]
enum Instruction {
    Constant(usize),
    Add,
    GreaterThan,
    JumpIfFalse(usize),
    Jump(usize),
    Print,
    Halt,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct VmError(String);

impl fmt::Display for VmError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl Error for VmError {}

struct Vm {
    code: Vec<Instruction>,
    constants: Vec<Value>,
    stack: Vec<Value>,
    instruction_pointer: usize,
    steps_left: usize,
}

impl Vm {
    fn new(code: Vec<Instruction>, constants: Vec<Value>, step_budget: usize) -> Self {
        Self {
            code,
            constants,
            stack: Vec::new(),
            instruction_pointer: 0,
            steps_left: step_budget,
        }
    }

    fn run(&mut self) -> Result<(), VmError> {
        loop {
            if self.steps_left == 0 {
                return Err(VmError("instruction budget exhausted".into()));
            }
            self.steps_left -= 1;

            let instruction = *self
                .code
                .get(self.instruction_pointer)
                .ok_or_else(|| VmError("instruction pointer left the program".into()))?;
            self.instruction_pointer += 1; // 🧭 Default to the next bytecode.

            match instruction {
                Instruction::Constant(index) => {
                    let value = *self
                        .constants
                        .get(index)
                        .ok_or_else(|| VmError(format!("missing constant {index}")))?;
                    self.stack.push(value);
                }
                Instruction::Add => {
                    let right = self.pop_integer("right side of add")?;
                    let left = self.pop_integer("left side of add")?;
                    let sum = left
                        .checked_add(right)
                        .ok_or_else(|| VmError("integer addition overflowed".into()))?;
                    self.stack.push(Value::Integer(sum));
                }
                Instruction::GreaterThan => {
                    let right = self.pop_integer("right side of comparison")?;
                    let left = self.pop_integer("left side of comparison")?;
                    self.stack.push(Value::Boolean(left > right));
                }
                Instruction::JumpIfFalse(target) => {
                    let condition = self.pop_boolean("conditional jump")?;
                    if !condition {
                        self.jump(target)?;
                    }
                }
                Instruction::Jump(target) => self.jump(target)?,
                Instruction::Print => {
                    let value = self
                        .stack
                        .pop()
                        .ok_or_else(|| VmError("print needs one stack value".into()))?;
                    println!("VM output: {value:?}");
                }
                Instruction::Halt => return Ok(()),
            }
        }
    }

    fn pop_integer(&mut self, purpose: &str) -> Result<i64, VmError> {
        match self.stack.pop() {
            Some(Value::Integer(value)) => Ok(value),
            Some(other) => Err(VmError(format!(
                "{purpose} expected integer, got {other:?}"
            ))),
            None => Err(VmError(format!("{purpose} found an empty stack"))),
        }
    }

    fn pop_boolean(&mut self, purpose: &str) -> Result<bool, VmError> {
        match self.stack.pop() {
            Some(Value::Boolean(value)) => Ok(value),
            Some(other) => Err(VmError(format!(
                "{purpose} expected boolean, got {other:?}"
            ))),
            None => Err(VmError(format!("{purpose} found an empty stack"))),
        }
    }

    fn jump(&mut self, target: usize) -> Result<(), VmError> {
        if target >= self.code.len() {
            return Err(VmError(format!(
                "jump target {target} is outside the program"
            )));
        }
        self.instruction_pointer = target;
        Ok(())
    }
}

fn main() -> Result<(), VmError> {
    // This means: if (5 + 2) > 6 then print 1 else print 0.
    let code = vec![
        Instruction::Constant(0),
        Instruction::Constant(1),
        Instruction::Add,
        Instruction::Constant(2),
        Instruction::GreaterThan,
        Instruction::JumpIfFalse(9),
        Instruction::Constant(3),
        Instruction::Print,
        Instruction::Jump(11),
        Instruction::Constant(4),
        Instruction::Print,
        Instruction::Halt,
    ];
    let constants = vec![
        Value::Integer(5),
        Value::Integer(2),
        Value::Integer(6),
        Value::Integer(1),
        Value::Integer(0),
    ];

    Vm::new(code, constants, 100).run()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_an_out_of_range_jump() {
        let mut vm = Vm::new(vec![Instruction::Jump(50)], vec![], 10);
        assert_eq!(
            vm.run(),
            Err(VmError("jump target 50 is outside the program".into()))
        );
    }

    #[test]
    fn stops_an_infinite_loop_at_the_budget() {
        let mut vm = Vm::new(vec![Instruction::Jump(0)], vec![], 3);
        assert_eq!(
            vm.run(),
            Err(VmError("instruction budget exhausted".into()))
        );
    }
}
