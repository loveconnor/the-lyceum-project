"use client";

export type { ComponentRenderProps, ComponentRegistry } from "./types";
export { useInteractiveState } from "./utils";

export { Alert } from "./alert";
export { Avatar } from "./avatar";
export { Badge } from "./badge";
export { BarGraph } from "./bar-graph";
export { Button } from "./button";
export { Card } from "./card";
export { Checkbox } from "./checkbox";
export { Divider } from "./divider";
export { DragDrop } from "./DragDrop";
export { CodeFill } from "./CodeFill";
export { DiagramSelection } from "./DiagramSelection";
export { EquationBuilder } from "./EquationBuilder";
export { Fallback } from "./fallback";
export { FillInTheBlank } from "./FillInTheBlank";
export { Form } from "./form";
export { Grid } from "./grid";
export { Heading } from "./heading";
export { Image } from "./image";
export { Input } from "./input";
export { LineGraph } from "./line-graph";
export { Link } from "./link";
export { Markdown } from "./markdown";
export { Matching } from "./Matching";
export { NumericInput } from "./NumericInput";
export { OrderSteps } from "./OrderSteps";
export { MultipleChoice } from "./MultipleChoice";
export { Progress } from "./progress";
export { Radio } from "./radio";
export { Rating } from "./rating";
export { Select } from "./select";
export { ShortAnswer } from "./ShortAnswer";
export { Stack } from "./stack";
export { Switch } from "./switch";
export { Text } from "./text";
export { Textarea } from "./textarea";
export { TrueFalse } from "./TrueFalse";

import type { ComponentRegistry } from "./types";
import { Alert } from "./alert";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { BarGraph } from "./bar-graph";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { Divider } from "./divider";
import { DragDrop } from "./DragDrop";
import { CodeFill } from "./CodeFill";
import { DiagramSelection } from "./DiagramSelection";
import { EquationBuilder } from "./EquationBuilder";
import { Fallback } from "./fallback";
import { FillInTheBlank } from "./FillInTheBlank";
import { Form } from "./form";
import { Grid } from "./grid";
import { Heading } from "./heading";
import { Image } from "./image";
import { Input } from "./input";
import { LineGraph } from "./line-graph";
import { Link } from "./link";
import { Markdown } from "./markdown";
import { Matching } from "./Matching";
import { NumericInput } from "./NumericInput";
import { OrderSteps } from "./OrderSteps";
import { MultipleChoice } from "./MultipleChoice";
import { Progress } from "./progress";
import { Radio } from "./radio";
import { Rating } from "./rating";
import { Select } from "./select";
import { ShortAnswer } from "./ShortAnswer";
import { Stack } from "./stack";
import { Switch } from "./switch";
import { Text } from "./text";
import { Textarea } from "./textarea";
import { TrueFalse } from "./TrueFalse";

export const demoRegistry: ComponentRegistry = {
  Alert,
  Avatar,
  Badge,
  BarGraph,
  Button,
  Card,
  Checkbox,
  Divider,
  DragDrop,
  CodeFill,
  DiagramSelection,
  EquationBuilder,
  FillInTheBlank,
  Form,
  Grid,
  Heading,
  Image,
  Input,
  LineGraph,
  Link,
  Markdown,
  Matching,
  NumericInput,
  OrderSteps,
  MultipleChoice,
  Progress,
  Radio,
  Rating,
  Select,
  ShortAnswer,
  Stack,
  Switch,
  Text,
  Textarea,
  TrueFalse,
};

export const fallbackComponent = Fallback;
