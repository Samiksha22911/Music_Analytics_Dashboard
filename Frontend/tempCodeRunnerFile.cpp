#include<iostream>
using namespace std;
int fact(int num){
    int fact = 1;
    fact(num) = num * fact(num - 1);
}
int main(){
    int n;
    cout << "enter the number :";
    cin >> n;
    if(n < 0){
        cout<<"factorial cannot  be find for -ve number";
    }
    if(n = 0 or n = 1){
        return 1;
    }
    else{
        return fact(n);
    }
 return 0;  
}