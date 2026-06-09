export function sumList(numbers: number[]): number {
  if(numbers.length ===0){
    return 0;
  }
  return numbers.reduce((acc,current)=>acc+current,0)
}

export function boundedSum(numbers: number[], lower: number, upper: number): number {
  if(numbers.length ===0){
    return 0
  }
   return numbers.reduce((acc,current)=>{
    if(current >= lower && current <=upper){
       return acc+current;
    }
    return acc;
  },0) ?? 0
}
