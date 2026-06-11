interface Book{
  id:string;
  title:string;
  totalCopies: number;
 }
 interface Checkout{
  userId:string;
  bookId: string;
  returned:boolean;
  dueDate?:number;

 }

type UserId = string
type BookId = string
export class Library {
  
  books: Map<string,Book>;
  checkouts: Set<Checkout>
  waitist: Map<BookId, UserId[]>
  constructor(){
    this.books = new Map()
    this.checkouts =  new Set<Checkout>()
    this.waitist = new Map();
  }
  addBook(id: string, title: string, totalCopies: number): boolean{

    if(this.books.has(id)){
      return false;
    }
    this.books.set(id,{id,title,totalCopies})
    this.waitist.set(id,[])
    return true
  }
   getAvailableCopies(bookId: string): number | null{
    if(!this.books.has(bookId)){
      return null;
    }
     
    return this.books.get(bookId)!.totalCopies - [...this.checkouts.values()].filter((checkout)=>!checkout.returned && checkout.bookId === bookId).length
  }

  checkout(bookId: string, userId: string,dueDate?:number): boolean{
    if(!this.books.has(bookId)){
      return false
    }

    if(this.getAvailableCopies(bookId)==0){
      return false;
    }
    this.checkouts.add({
      bookId,
      userId,
      returned:false,
      dueDate
    })
    
    return true;
  }
  returnBook(bookId: string, userId: string): boolean | UserId | null{

    if(!this.getBooksCheckedOutBy(userId).includes(bookId)){
      return false;
    }
    let checkout = [...this.checkouts].find((c)=>c.bookId === bookId && c.userId=== userId && !c.returned);

    if(!checkout){
       return false;
    }

    checkout.returned = true;
     if(this.waitist.get(bookId)?.length=== 0){
      return null
    }else{
       const nextUser = this.waitist.get(bookId)?.shift()!
      this.checkouts.add({
        bookId,
        returned:false,
        userId: nextUser
      })
      return nextUser
    }
    return true
  }
 
  getBooksCheckedOutBy(userId: string): string[]{
 
    return [...this.checkouts.values()].filter((checkout)=>checkout.userId === userId).map((c)=>c.bookId).sort()
    
  }
    getCheckoutsByBookId(bookId:string):Checkout[]{

    return [...this.checkouts.values()].filter((checkout)=>checkout.bookId === bookId)
  }
  addToWaitlist(bookId:string,userId:string): boolean{
   
    
    if(this.getAvailableCopies(bookId) === null  ){
      return false;
    }
    if(this.getAvailableCopies(bookId)!>0){
      return false;
    }
    if(!this.books.has(bookId)){
      return false;
    }

    // User has the book
    if(this.getBooksCheckedOutBy(userId).includes(bookId)){
      return false;
    }
 
    if(this.waitist.get(bookId)!.includes(userId)){
       return false
    }
     this.waitist.get(bookId)?.push(userId);
    return true
  }
    getWaitlist(bookId: string): string[] {

      return this.waitist.get(bookId) ?? []
    }
    getWaitlistPosition(bookId:string,userId:string):number | null{
      const waitlist = this.getWaitlist(bookId)
      if(!waitlist || !waitlist.includes(userId)){
        return null;
      }
      return waitlist.indexOf(userId)+1
    }
    getOverdueBooks(currentTime:number):string[]{
      return [...this.checkouts.values()].filter(({dueDate})=>dueDate!== undefined && dueDate< currentTime).map(({bookId})=>bookId).sort()
    }
    getOverdueByUser(userId: string, currentTime: number): string[]  {
        return [...this.checkouts.values()].filter((checkout)=>checkout.dueDate!== undefined && checkout.dueDate< currentTime && checkout.userId === userId).map(({bookId})=>bookId).sort()

    }
    getBooksOf(userId:UserId){
      return [...this.checkouts.values()].filter((checkout)=> checkout.userId === userId).map(({bookId})=>bookId).sort()
    }
    getDaysOverdue(bookId: string, userId: string, currentTime: number): number | null{

       if(!this.getBooksOf(userId).includes(bookId)){
        return null
      }
       const overdueCheckout = [...this.checkouts].find((checkout)=>checkout.bookId === bookId && checkout.userId === userId && checkout.dueDate!== undefined && checkout.dueDate < currentTime)
   
       if(overdueCheckout === undefined){
          return 0
       }
       return Math.floor((currentTime - overdueCheckout!.dueDate!)/86400000)
    }


}
