#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_S1 4
#define ONE_WIRE_S2 5

OneWire oneWireS1(ONE_WIRE_S1);
OneWire oneWireS2(ONE_WIRE_S2);

DallasTemperature sensor1(&oneWireS1);
DallasTemperature sensor2(&oneWireS2);

void setup(void)
{
  Serial.begin(9600);
  
  sensor1.begin();
  sensor2.begin();
}

void loop(void){
  sensor1.requestTemperatures(); 
  sensor2.requestTemperatures(); 

  double temp1 = sensor1.getTempCByIndex(0);
  double temp2 = sensor2.getTempCByIndex(0);
  
  Serial.print("Temp1: ");
  Serial.print(temp1); 
  Serial.print(" Temp2: ");
  Serial.print(temp2); 
  Serial.print(" Diff: ");
  Serial.println(temp2-temp1); 
  delay(250);
}