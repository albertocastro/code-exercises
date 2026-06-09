type VehicleType = 'COMPACT' | 'REGULAR' | 'LARGE'

export class ParkingGarage {
  // your code here
  
  parking : Map<VehicleType,Set<string>>
  parkingCapacity: Map<VehicleType,number>
  entryTime: Map<string,number>
  vehicleTypeOrder: VehicleType[]
  rates : Map<VehicleType,number>
  revenue:Map<VehicleType,number[]>;
  constructor(compactCapacity: number,regularCapacity: number = 0,largeCapacity: number = 0){
   
 
    this.parkingCapacity = new Map<VehicleType,number>()
    this.parkingCapacity.set("COMPACT",compactCapacity)
    this.parkingCapacity.set("REGULAR",regularCapacity)
    this.parkingCapacity.set("LARGE",largeCapacity)

    this.rates = new Map()
    this.rates.set("COMPACT",2)
    this.rates.set("REGULAR",3)
    this.rates.set("LARGE",5)

    this.revenue = new Map();
    this.parking = new Map();
    this.vehicleTypeOrder = ["COMPACT","REGULAR","LARGE"]
    
    this.entryTime = new Map();
    this.vehicleTypeOrder.map((type)=>{
      this.parking.set(type,new Set<string>())
      this.revenue.set(type,[])
      
    })
 
  }
 

  park(vehicleId: string,type: VehicleType = "COMPACT", entryTime?:number){

    const allCars = this.getAllCarsAsSet();
    //  console.log({vehicleId,allCars,type})
    if(allCars.has(vehicleId)){
      return false;
    }
    let startingIndex = this.vehicleTypeOrder.indexOf(type)
 
    // console.log({startingIndex})
    
    
    for(let i = startingIndex;i<this.vehicleTypeOrder.length;i++){
      const currentParkingType = this.vehicleTypeOrder[i];
          

       if(this.parking.get(currentParkingType)!.size < this.parkingCapacity.get(currentParkingType)!  ){

        this.parking.get(currentParkingType)?.add(vehicleId);
        if(entryTime!== undefined){
          this.entryTime.set(vehicleId,entryTime)
        }
        
        
        return true;
        
      }
      
    }
    
    return false;
  }
  unpark(vehicleId:string,exitTime?:number){
     if(!this.getAllCarsAsSet().has(vehicleId) && exitTime=== undefined){
      return false;
    }
    if(!this.getAllCarsAsSet().has(vehicleId) && exitTime!== undefined){
       return null;
    }
    for(let i = 0;i<this.vehicleTypeOrder.length;i++){
      if(this.parking.get(this.vehicleTypeOrder[i])?.has(vehicleId)){

        this.parking.get(this.vehicleTypeOrder[i])?.delete(vehicleId);
        
        if(exitTime!== undefined){
          const duration = exitTime - this.entryTime.get(vehicleId)!
          let durationInHours =  Math.ceil(duration /(1000 * 60 * 60))
          if(durationInHours ===0){
            durationInHours = 1
          }
          const fee =  durationInHours * this.rates.get(this.vehicleTypeOrder[i])!
          
          this.revenue.get(this.vehicleTypeOrder[i])?.push(fee)
          return fee
        }
        return true;
      }
    }

    return false;
  }
  getRevenue(){
    return [...this.revenue.entries()].flatMap(([vehicleType,revenueArrray])=>revenueArrray.reduce((acc,current)=>acc+current,0)).reduce((acc,current)=>acc+current,0);
  }
  isParked(vehicleId:string){
    
    return this.getAllCarsAsSet().has(vehicleId);
  }
  getAllCars(){
    return    [...this.parking.values()].flatMap((set) => [...set])
  }
 getAllCarsAsSet(): Set<string> {

  return new Set(

    [...this.parking.values()].flatMap((set) => [...set])

  );

}
  getAvailableSpots(type?:VehicleType){
    return this.parkingCapacity.get(type ?? "COMPACT")! - this.parking.get(type ?? "COMPACT")?.size!
  }
  getCurrentlyParked(): string[]{
    console.log("currently parked",this.getAllCars())
    return this.getAllCars().sort()
  }
  getVehiclesByType(type: VehicleType):string[]{
    return [...this.parking.get(type)! ].sort()
  }
  getLongestParkedVehicle(): string | null{

    if(this.entryTime.size ===0){
      return null;
    }
    return [...this.entryTime.entries()].reduce(([accVehicleId,accStartTime ],[vehicleId,startTime])=>{
      console.log("iterating?",accStartTime,accVehicleId)
      if(startTime < accStartTime){
        return [vehicleId,startTime]
      }else{
        return [accVehicleId,accStartTime] 
      }

    })[0] ?? null
    }
  getRevenueByType(type: VehicleType): number| null {
    if(this.revenue.size==0){
      return null
    }
    if(this.revenue.get(type)?.length ===0){
      return 0
    }
 
    return this.revenue.get(type)?.reduce((acc=0,current)=>acc+current) ?? 0
    
  }
}
